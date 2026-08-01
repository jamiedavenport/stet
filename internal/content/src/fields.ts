import { recordAudit } from '@repo/audit';
import type { Actor } from '@repo/audit';
import { and, database, eq, schema } from '@repo/db';
import { recordContentChange } from '@repo/webhooks/content';

import { liveFields, requireContentType, requireField } from './access';
import { broadcastContentChange } from './broadcast';
import { cleanNote, executeTogether, rekeyField } from './field-keys';
import { isReferenceType } from './schema';
import type { FieldConfig, FieldType } from './schema';
import { slugify, uniqueSlug } from './slug';

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
    columns: { position: true },
  });
  const keys = await db.query.contentFieldKey.findMany({
    where: eq(schema.contentFieldKey.typeId, type.id),
    columns: { key: true },
  });
  const key = uniqueSlug(slugify(input.name, '_'), new Set(keys.map((row) => row.key)), '_');
  const id = crypto.randomUUID();
  const createdAt = new Date();
  await executeTogether(db, [
    db.insert(schema.contentField).values({
      id,
      typeId: type.id,
      name: input.name,
      type: input.type,
      config: JSON.stringify(config),
      position: siblings.length === 0 ? 0 : Math.max(...siblings.map((f) => f.position)) + 1,
      createdAt,
    }),
    db.insert(schema.contentFieldKey).values({
      id: crypto.randomUUID(),
      fieldId: id,
      typeId: type.id,
      key,
      status: 'canonical',
      createdAt,
    }),
  ]);
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
  await broadcastContentChange(organizationId, type);
  return { id, key };
}

export async function updateField(
  organizationId: string,
  input: { id: string; name?: string; config?: FieldConfig; note?: string },
  actor: Actor,
): Promise<{ key: string }> {
  const db = await database();
  const field = await requireField(organizationId, input.id);
  const type = await requireContentType(organizationId, field.typeId);
  const name = input.name ?? field.name;
  const renamed = name !== field.name;
  const key = renamed ? await rekeyField(field, name, input.note, actor) : field.key;
  await db
    .update(schema.contentField)
    .set({
      name,
      config: input.config === undefined ? field.config : JSON.stringify(input.config),
    })
    .where(eq(schema.contentField.id, field.id));
  await recordAudit({
    organizationId,
    actor,
    action: 'field.update',
    subject: { type: 'field', id: field.id, label: name },
    details: renamed ? { from: field.name, to: name, fromKey: field.key, toKey: key } : {},
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
  await broadcastContentChange(organizationId, type);
  return { key };
}

export async function moveField(
  organizationId: string,
  input: { id: string; direction: 'left' | 'right' },
): Promise<void> {
  const db = await database();
  const field = await requireField(organizationId, input.id);
  // Tombstones are excluded here, unlike in the key checks: a move steps past
  // the neighbour the editor can see, not one they cannot.
  const siblings = await liveFields(field.typeId);
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
  const type = await requireContentType(organizationId, field.typeId);
  await broadcastContentChange(organizationId, type);
}

/**
 * Retires a field. The row is tombstoned rather than removed: `/api/v1/model`
 * keeps serving it so the generated client can deprecate the key, which is
 * what lets a developer's build survive a deletion made in the UI and migrate
 * on its own schedule.
 */
export async function deleteField(
  organizationId: string,
  id: string,
  actor: Actor,
  note?: string,
): Promise<void> {
  const field = await requireField(organizationId, id);
  const type = await requireContentType(organizationId, field.typeId);
  const db = await database();
  const deletedAt = new Date();
  await executeTogether(db, [
    db.update(schema.contentField).set({ deletedAt }).where(eq(schema.contentField.id, field.id)),
    db
      .update(schema.contentFieldKey)
      .set({
        status: 'deprecated',
        kind: 'deleted',
        oldName: field.name,
        note: cleanNote(note),
        deprecatedAt: deletedAt,
        deprecatedBy: actor.userId,
      })
      .where(
        and(
          eq(schema.contentFieldKey.fieldId, field.id),
          eq(schema.contentFieldKey.status, 'canonical'),
        ),
      ),
  ]);
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
  await broadcastContentChange(organizationId, type);
}
