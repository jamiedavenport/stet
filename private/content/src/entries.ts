import { and, database, eq, schema } from '@repo/db';
import { entryPage } from '@repo/realtime/entry';

import { requireContentType, requireEntry } from './access';
import { parseValues, valuesText } from './schema';
import type { EntryValues } from './schema';
import { slugify, uniqueSlug } from './slug';

// Entry domain operations, shared by the server functions and the AI
// assistant's tools. Server-only, like ./access: callers authenticate
// and resolve the organization before reaching them.

export async function createEntry(
  organizationId: string,
  input: { typeId: string; title?: string; values?: EntryValues },
): Promise<{ id: string; slug: string }> {
  const db = await database();
  const type = await requireContentType(organizationId, input.typeId);
  if (type.kind === 'map') {
    throw new Error('A map has exactly one entry');
  }
  const title = input.title === undefined || input.title === '' ? 'Untitled' : input.title;
  const values = input.values ?? {};
  const siblings = await db.query.contentEntry.findMany({
    where: eq(schema.contentEntry.typeId, type.id),
    columns: { slug: true },
  });
  const slug = uniqueSlug(slugify(title), new Set(siblings.map((entry) => entry.slug)));
  const id = crypto.randomUUID();
  await db.insert(schema.contentEntry).values({
    id,
    typeId: type.id,
    organizationId,
    slug,
    title,
    values: JSON.stringify(values),
    fieldText: valuesText(values),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { id, slug };
}

export async function updateEntry(
  organizationId: string,
  input: { id: string; title?: string; slug?: string; values?: EntryValues },
): Promise<{ slug: string }> {
  const db = await database();
  const entry = await requireEntry(organizationId, input.id);
  let slug = entry.slug;
  if (input.slug !== undefined && slugify(input.slug) !== entry.slug) {
    const siblings = await db.query.contentEntry.findMany({
      where: eq(schema.contentEntry.typeId, entry.typeId),
      columns: { slug: true },
    });
    slug = uniqueSlug(slugify(input.slug), new Set(siblings.map((row) => row.slug)));
  }
  const values =
    input.values === undefined
      ? parseValues(entry.values)
      : { ...parseValues(entry.values), ...input.values };
  await db
    .update(schema.contentEntry)
    .set({
      title: input.title ?? entry.title,
      slug,
      values: JSON.stringify(values),
      fieldText: valuesText(values),
      updatedAt: new Date(),
    })
    .where(eq(schema.contentEntry.id, entry.id));
  return { slug };
}

export async function deleteEntry(organizationId: string, id: string): Promise<void> {
  const db = await database();
  const entry = await requireEntry(organizationId, id);
  // The body document does not cascade with the row.
  await db
    .delete(schema.document)
    .where(
      and(
        eq(schema.document.organizationId, organizationId),
        eq(schema.document.page, entryPage(entry.id)),
      ),
    );
  await db.delete(schema.contentEntry).where(eq(schema.contentEntry.id, entry.id));
}
