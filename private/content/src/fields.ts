import { asc, database, eq, schema } from '@repo/db';

import { requireContentType, requireField } from './access';
import type { FieldConfig, FieldType } from './schema';
import { slugify, uniqueSlug } from './slug';

// Field domain operations, shared by the server functions and the AI
// assistant's tools. Server-only, like ./access: callers authenticate
// and resolve the organization before reaching them.

export async function createField(
  organizationId: string,
  input: { typeId: string; name: string; type: FieldType },
): Promise<{ id: string; key: string }> {
  const db = await database();
  const type = await requireContentType(organizationId, input.typeId);
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
    config: '{}',
    position: siblings.length === 0 ? 0 : Math.max(...siblings.map((f) => f.position)) + 1,
    createdAt: new Date(),
  });
  return { id, key };
}

export async function updateField(
  organizationId: string,
  input: { id: string; name?: string; config?: FieldConfig },
): Promise<void> {
  const db = await database();
  const field = await requireField(organizationId, input.id);
  await db
    .update(schema.contentField)
    .set({
      name: input.name ?? field.name,
      config: input.config === undefined ? field.config : JSON.stringify(input.config),
    })
    .where(eq(schema.contentField.id, field.id));
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

export async function deleteField(organizationId: string, id: string): Promise<void> {
  const field = await requireField(organizationId, id);
  const db = await database();
  // Stale keys left in entry values are dropped on read, so entries are
  // not rewritten here.
  await db.delete(schema.contentField).where(eq(schema.contentField.id, field.id));
}
