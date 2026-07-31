import { recordAudit } from '@repo/audit';
import type { Actor } from '@repo/audit';
import { and, database, eq, schema } from '@repo/db';
import { entryPage } from '@repo/realtime/entry';
import { recordContentChange } from '@repo/webhooks/content';

import { requireContentType, requireEntry } from './access';
import { broadcastContentChange } from './broadcast';
import { recordEntryRevision } from './revisions';
import { parseValues, valuesText } from './schema';
import type { EntryValues } from './schema';
import { isDerivedSlug, slugify, uniqueSlug } from './slug';

// Entry domain operations, shared by the server functions and the AI
// assistant's tools. Server-only, like ./access: callers authenticate,
// resolve the organization, and say who is acting before reaching them.

// One audit row per editing burst; the revision carries the actual states.
const editCoalesceMs = 10 * 60_000;

export async function createEntry(
  organizationId: string,
  input: { typeId: string; title?: string; values?: EntryValues },
  actor: Actor,
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
  await recordEntryRevision(organizationId, id, actor);
  await recordAudit({
    organizationId,
    actor,
    action: 'entry.create',
    subject: { type: 'entry', id, label: title },
  });
  await recordContentChange(organizationId, {
    subject: 'entry',
    action: 'created',
    id,
    type: type.slug,
    slug,
    title,
  });
  await broadcastContentChange(organizationId, type);
  return { id, slug };
}

export async function updateEntry(
  organizationId: string,
  input: { id: string; title?: string; slug?: string; values?: EntryValues },
  actor: Actor,
): Promise<{ slug: string }> {
  const db = await database();
  const entry = await requireEntry(organizationId, input.id);
  const type = await requireContentType(organizationId, entry.typeId);
  // A slug the writer has never touched keeps following the title, which is
  // what makes renaming a fresh entry feel like nothing happened. The moment
  // it stops matching the title it is theirs, and a rename leaves it alone:
  // the slug is the entry's public handle, so moving one anybody has chosen
  // would break their URLs and their client calls to no purpose.
  const chosen = input.slug !== undefined && slugify(input.slug) !== entry.slug;
  const following =
    !chosen &&
    input.title !== undefined &&
    isDerivedSlug(entry.slug, entry.title) &&
    slugify(input.title) !== entry.slug;

  let slug = entry.slug;
  if (chosen || following) {
    const siblings = await db.query.contentEntry.findMany({
      where: eq(schema.contentEntry.typeId, entry.typeId),
      columns: { slug: true },
    });
    const taken = new Set(siblings.map((row) => row.slug));
    // Its own slug is about to be given up, so it cannot collide with itself.
    taken.delete(entry.slug);
    slug = uniqueSlug(slugify(chosen ? (input.slug ?? '') : (input.title ?? '')), taken);
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
  await recordEntryRevision(organizationId, entry.id, actor);
  await recordAudit({
    organizationId,
    actor,
    action: 'entry.update',
    subject: { type: 'entry', id: entry.id, label: input.title ?? entry.title },
    coalesceMs: editCoalesceMs,
  });
  await recordContentChange(organizationId, {
    subject: 'entry',
    action: 'updated',
    id: entry.id,
    type: type.slug,
    slug,
    title: input.title ?? entry.title,
  });
  await broadcastContentChange(organizationId, type);
  return { slug };
}

export async function deleteEntry(organizationId: string, id: string, actor: Actor): Promise<void> {
  const db = await database();
  const entry = await requireEntry(organizationId, id);
  const type = await requireContentType(organizationId, entry.typeId);
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
  await recordAudit({
    organizationId,
    actor,
    action: 'entry.delete',
    subject: { type: 'entry', id: entry.id, label: entry.title },
  });
  await recordContentChange(organizationId, {
    subject: 'entry',
    action: 'deleted',
    id: entry.id,
    type: type.slug,
    slug: entry.slug,
    title: entry.title,
  });
  await broadcastContentChange(organizationId, type);
}
