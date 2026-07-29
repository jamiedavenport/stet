import { and, database, eq, schema } from '@repo/db';

// Server-only ownership checks, in their own module so no client-imported
// file exports code that touches the database: TanStack Start can only strip
// what handlers keep to themselves.

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
  const field = await db.query.contentField.findFirst({
    where: eq(schema.contentField.id, id),
  });
  if (field === undefined) {
    throw new Error('Field not found');
  }
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
