import { recordAudit } from '@repo/audit';
import type { Actor } from '@repo/audit';
import { and, asc, database, eq, inArray, schema } from '@repo/db';
import { entryPage } from '@repo/realtime/entry';
import { recordContentChange } from '@repo/webhooks/content';

import { requireContentType, requireField } from './access';
import { isReferenceType, parseValues, valuesText } from './schema';
import type { FieldConfig, FieldType } from './schema';
import { slugify, uniqueSlug } from './slug';
import { moveEntryBody } from './write-body';

// Field domain operations, shared by the server functions and the AI
// assistant's tools. Server-only, like ./access: callers authenticate,
// resolve the organization, and say who is acting before reaching them.

export async function createField(
  organizationId: string,
  input: { typeId: string; name: string; type: FieldType; config?: FieldConfig },
  actor: Actor,
): Promise<{ id: string; key: string }> {
  const db = await database();
  const type = await requireContentType(organizationId, input.typeId);
  const config = input.config ?? {};
  if (isReferenceType(input.type)) {
    if (config.typeId === undefined) {
      throw new Error('A reference field needs a target collection');
    }
    const target = await requireContentType(organizationId, config.typeId);
    if (target.kind !== 'collection') {
      throw new Error('A reference field must point at a collection');
    }
  }
  const siblings = await db.query.contentField.findMany({
    where: eq(schema.contentField.typeId, type.id),
    columns: { key: true, position: true },
  });
  const key = uniqueSlug(slugify(input.name, '_'), new Set(siblings.map((f) => f.key)), '_');
  const id = crypto.randomUUID();
  await db.insert(schema.contentField).values({
    id,
    typeId: type.id,
    key,
    name: input.name,
    type: input.type,
    config: JSON.stringify(config),
    position: siblings.length === 0 ? 0 : Math.max(...siblings.map((f) => f.position)) + 1,
    createdAt: new Date(),
  });
  await recordAudit({
    organizationId,
    actor,
    action: 'field.create',
    subject: { type: 'field', id, label: input.name },
    details: { fieldType: input.type, contentType: type.name },
  });
  await recordContentChange(organizationId, {
    subject: 'field',
    action: 'created',
    id,
    type: type.slug,
    key,
    name: input.name,
  });
  return { id, key };
}

export async function updateField(
  organizationId: string,
  input: { id: string; name?: string; config?: FieldConfig },
  actor: Actor,
): Promise<{ key: string }> {
  const db = await database();
  const field = await requireField(organizationId, input.id);
  const type = await requireContentType(organizationId, field.typeId);
  const name = input.name ?? field.name;
  const renamed = name !== field.name;
  // The key is the name in API form, so a rename carries it along, taking
  // everything written under the old key with it.
  const key = renamed ? await rekey(organizationId, field, name) : field.key;
  await db
    .update(schema.contentField)
    .set({
      key,
      name,
      config: input.config === undefined ? field.config : JSON.stringify(input.config),
    })
    .where(eq(schema.contentField.id, field.id));
  await recordAudit({
    organizationId,
    actor,
    action: 'field.update',
    subject: { type: 'field', id: field.id, label: name },
    details: renamed ? { from: field.name, to: name } : {},
    coalesceMs: 10 * 60_000,
  });
  await recordContentChange(organizationId, {
    subject: 'field',
    action: 'updated',
    id: field.id,
    type: type.slug,
    key,
    name,
  });
  return { key };
}

type StoredField = Awaited<ReturnType<typeof requireField>>;

/**
 * Gives a renamed field the key its new name earns and moves the content
 * stored under the old one: values live in each entry's JSON, rich text
 * bodies in their own root of the entry's realtime document.
 */
async function rekey(organizationId: string, field: StoredField, name: string): Promise<string> {
  const db = await database();
  const siblings = await db.query.contentField.findMany({
    where: eq(schema.contentField.typeId, field.typeId),
    columns: { id: true, key: true },
  });
  const taken = new Set(
    siblings.filter((sibling) => sibling.id !== field.id).map((sibling) => sibling.key),
  );
  const key = uniqueSlug(slugify(name, '_'), taken, '_');
  if (key === field.key) {
    return key;
  }

  const entries = await db.query.contentEntry.findMany({
    where: eq(schema.contentEntry.typeId, field.typeId),
    columns: { id: true, values: true },
  });
  for (const entry of entries) {
    const values = parseValues(entry.values);
    if (!(field.key in values)) {
      continue;
    }
    const moved = { ...values, [key]: values[field.key] };
    delete moved[field.key];
    await db
      .update(schema.contentEntry)
      .set({ values: JSON.stringify(moved), fieldText: valuesText(moved) })
      .where(eq(schema.contentEntry.id, entry.id));
  }

  if (field.type === 'rich_text' && entries.length > 0) {
    // Only entries whose document has been flushed can hold a body, so the
    // rest need no room woken to find out they have nothing to move.
    const written = await db.query.document.findMany({
      where: and(
        eq(schema.document.organizationId, organizationId),
        inArray(
          schema.document.page,
          entries.map((entry) => entryPage(entry.id)),
        ),
      ),
      columns: { page: true },
    });
    const pages = new Set(written.map((row) => row.page));
    for (const entry of entries) {
      if (pages.has(entryPage(entry.id))) {
        await moveEntryBody({ organizationId, entryId: entry.id, from: field.key, to: key });
      }
    }
  }

  return key;
}

export async function moveField(
  organizationId: string,
  input: { id: string; direction: 'left' | 'right' },
): Promise<void> {
  const db = await database();
  const field = await requireField(organizationId, input.id);
  const siblings = await db.query.contentField.findMany({
    where: eq(schema.contentField.typeId, field.typeId),
    orderBy: asc(schema.contentField.position),
  });
  const index = siblings.findIndex((sibling) => sibling.id === field.id);
  const neighbor = siblings[input.direction === 'left' ? index - 1 : index + 1];
  if (neighbor === undefined) {
    return;
  }
  await db
    .update(schema.contentField)
    .set({ position: neighbor.position })
    .where(eq(schema.contentField.id, field.id));
  await db
    .update(schema.contentField)
    .set({ position: field.position })
    .where(eq(schema.contentField.id, neighbor.id));
}

export async function deleteField(organizationId: string, id: string, actor: Actor): Promise<void> {
  const field = await requireField(organizationId, id);
  const type = await requireContentType(organizationId, field.typeId);
  const db = await database();
  // Stale keys left in entry values are dropped on read, so entries are
  // not rewritten here.
  await db.delete(schema.contentField).where(eq(schema.contentField.id, field.id));
  await recordAudit({
    organizationId,
    actor,
    action: 'field.delete',
    subject: { type: 'field', id: field.id, label: field.name },
    details: { fieldType: field.type },
  });
  await recordContentChange(organizationId, {
    subject: 'field',
    action: 'deleted',
    id: field.id,
    type: type.slug,
    key: field.key,
    name: field.name,
  });
}
