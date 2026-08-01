import { and, asc, database, eq, isNull, schema } from '@repo/db';

// Server-only ownership checks, in their own module so no client-imported
// file exports code that touches the database: TanStack Start can only strip
// what handlers keep to themselves.

/**
 * A content type's fields in model order, tombstones excluded. Deleting a
 * field only stamps `deletedAt` (see ./fields), so every reader goes through
 * here; the one exception is `/api/v1/model`, which carries the tombstones as
 * deprecations for the generated client.
 */
export async function liveFields(typeId: string) {
  const db = await database();
  const rows = await db
    .select({ field: schema.contentField, key: schema.contentFieldKey.key })
    .from(schema.contentField)
    .innerJoin(
      schema.contentFieldKey,
      and(
        eq(schema.contentFieldKey.fieldId, schema.contentField.id),
        eq(schema.contentFieldKey.status, 'canonical'),
      ),
    )
    .where(and(eq(schema.contentField.typeId, typeId), isNull(schema.contentField.deletedAt)))
    .orderBy(asc(schema.contentField.position));
  return rows.map(({ field, key }) => ({ ...field, key }));
}

export async function requireContentType(organizationId: string, id: string) {
  const db = await database();
  const type = await db.query.contentType.findFirst({
    where: and(
      eq(schema.contentType.id, id),
      eq(schema.contentType.organizationId, organizationId),
    ),
  });
  if (type === undefined) {
    throw new Error('Content type not found');
  }
  return type;
}

export async function requireField(organizationId: string, id: string) {
  const db = await database();
  const rows = await db
    .select({ field: schema.contentField, key: schema.contentFieldKey.key })
    .from(schema.contentField)
    .innerJoin(
      schema.contentFieldKey,
      and(
        eq(schema.contentFieldKey.fieldId, schema.contentField.id),
        eq(schema.contentFieldKey.status, 'canonical'),
      ),
    )
    .where(and(eq(schema.contentField.id, id), isNull(schema.contentField.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (row === undefined) {
    throw new Error('Field not found');
  }
  const field = { ...row.field, key: row.key };
  await requireContentType(organizationId, field.typeId);
  return field;
}

export async function requireEntry(organizationId: string, id: string) {
  const db = await database();
  const entry = await db.query.contentEntry.findFirst({
    where: and(
      eq(schema.contentEntry.id, id),
      eq(schema.contentEntry.organizationId, organizationId),
    ),
  });
  if (entry === undefined) {
    throw new Error('Entry not found');
  }
  return entry;
}
