import { recordAudit } from '@repo/audit';
import type { Actor } from '@repo/audit';
import { and, database, desc, eq, schema } from '@repo/db';
import { loadDocument } from '@repo/realtime/document';
import type { DocumentRoom } from '@repo/realtime/document';
import { entryIdFromPage, entryPage } from '@repo/realtime/entry';
import { recordContentChange } from '@repo/webhooks/content';
import type { Doc } from 'yjs';

import { requireContentType, requireEntry } from './access';
import { bodyMarkdown } from './body';
import { parseValues, valuesText } from './schema';
import { slugify, uniqueSlug } from './slug';
import { writeEntryBody } from './write-body';

// Entry revisions: full snapshots (metadata, values, bodies as markdown),
// written alongside every entry write and on realtime body flushes.
// Server-only, like ./entries.

// Snapshots by the same actor within this window update the latest revision
// in place (keeping its timestamp), so a long editing session reads as one
// revision every few minutes rather than one per keystroke.
const coalesceMs = 10 * 60_000;

/** Every rich text body in the document, keyed by field key. */
function documentBodies(doc: Doc): Record<string, string> {
  const bodies: Record<string, string> = {};
  for (const key of doc.share.keys()) {
    if (key.startsWith('body:')) {
      const fieldKey = key.slice('body:'.length);
      const markdown = bodyMarkdown(doc, fieldKey);
      // Emptied bodies serialize to whitespace; treating them as absent keeps
      // snapshots taken before and after a restore comparable.
      if (markdown !== null && markdown.trim().length > 0) {
        bodies[fieldKey] = markdown;
      }
    }
  }
  return bodies;
}

type EntryRow = typeof schema.contentEntry.$inferSelect;

async function latestRevision(entryId: string) {
  const db = await database();
  return db.query.contentRevision.findFirst({
    where: eq(schema.contentRevision.entryId, entryId),
    orderBy: desc(schema.contentRevision.createdAt),
  });
}

/** Whether the snapshot differed from the latest one, so anything was written. */
async function writeRevision(entry: EntryRow, bodies: string, actor: Actor): Promise<boolean> {
  const db = await database();
  const latest = await latestRevision(entry.id);
  const identical =
    latest !== undefined &&
    latest.title === entry.title &&
    latest.slug === entry.slug &&
    latest.values === entry.values &&
    latest.bodies === bodies;
  if (identical) {
    return false;
  }
  const coalesce =
    latest !== undefined &&
    latest.via === actor.via &&
    latest.authorId === actor.userId &&
    Date.now() - latest.createdAt.getTime() < coalesceMs;
  if (coalesce) {
    await db
      .update(schema.contentRevision)
      .set({ title: entry.title, slug: entry.slug, values: entry.values, bodies })
      .where(eq(schema.contentRevision.id, latest.id));
    return true;
  }
  await db.insert(schema.contentRevision).values({
    id: crypto.randomUUID(),
    entryId: entry.id,
    organizationId: entry.organizationId,
    title: entry.title,
    slug: entry.slug,
    values: entry.values,
    bodies,
    authorId: actor.userId,
    via: actor.via,
    createdAt: new Date(),
  });
  return true;
}

/**
 * Snapshots an entry after a values, title, or slug write. Bodies are carried
 * over from the latest revision (a values write cannot change them); only a
 * first-ever revision serializes them from the saved document.
 */
export async function recordEntryRevision(
  organizationId: string,
  entryId: string,
  actor: Actor,
): Promise<void> {
  const entry = await requireEntry(organizationId, entryId);
  const latest = await latestRevision(entryId);
  let bodies = latest?.bodies;
  if (bodies === undefined) {
    const saved = await loadDocument({ organizationId, page: entryPage(entryId) });
    bodies = JSON.stringify(saved === null ? {} : documentBodies(saved.doc));
  }
  await writeRevision(entry, bodies, actor);
}

/**
 * Snapshots an entry from its realtime room's flush, catching body edits that
 * never pass through ./entries. Attributed to the editor surface rather than
 * a person: a room can hold several writers at once.
 */
export async function recordBodyRevision(room: DocumentRoom, doc: Doc): Promise<void> {
  const entryId = entryIdFromPage(room.page);
  if (entryId === null) {
    return;
  }
  const db = await database();
  const entry = await db.query.contentEntry.findFirst({
    where: and(
      eq(schema.contentEntry.id, entryId),
      eq(schema.contentEntry.organizationId, room.organizationId),
    ),
  });
  if (entry === undefined) {
    return;
  }
  const written = await writeRevision(entry, JSON.stringify(documentBodies(doc)), {
    userId: null,
    via: 'editor',
  });
  // A room flushes on a timer whether or not anyone typed, so the snapshot is
  // what says a body actually moved.
  if (!written) {
    return;
  }
  const type = await requireContentType(room.organizationId, entry.typeId);
  await recordContentChange(room.organizationId, {
    subject: 'entry',
    action: 'updated',
    id: entry.id,
    type: type.slug,
    slug: entry.slug,
    title: entry.title,
  });
}

export type RevisionSummary = {
  id: string;
  title: string;
  slug: string;
  via: Actor['via'];
  /** Null for editor flushes and since-deleted users. */
  author: { id: string; name: string } | null;
  createdAt: Date;
};

/** The entry's revisions, newest first. */
export async function listEntryRevisions(
  organizationId: string,
  entryId: string,
): Promise<RevisionSummary[]> {
  await requireEntry(organizationId, entryId);
  const db = await database();
  const rows = await db
    .select({
      id: schema.contentRevision.id,
      title: schema.contentRevision.title,
      slug: schema.contentRevision.slug,
      via: schema.contentRevision.via,
      createdAt: schema.contentRevision.createdAt,
      authorId: schema.user.id,
      authorName: schema.user.name,
    })
    .from(schema.contentRevision)
    .leftJoin(schema.user, eq(schema.contentRevision.authorId, schema.user.id))
    .where(eq(schema.contentRevision.entryId, entryId))
    .orderBy(desc(schema.contentRevision.createdAt))
    .limit(50);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    via: row.via as Actor['via'],
    author:
      row.authorId === null || row.authorName === null
        ? null
        : { id: row.authorId, name: row.authorName },
    createdAt: row.createdAt,
  }));
}

/**
 * Puts an entry back to a revision's state: title, slug, values, and every
 * body the snapshot holds, written through the realtime room so open editors
 * follow live. Bodies written since the snapshot but absent from it are
 * emptied, so the result is the snapshot, not a merge.
 */
export async function restoreEntryRevision(
  organizationId: string,
  revisionId: string,
  actor: Actor,
): Promise<{ slug: string }> {
  const db = await database();
  const revision = await db.query.contentRevision.findFirst({
    where: and(
      eq(schema.contentRevision.id, revisionId),
      eq(schema.contentRevision.organizationId, organizationId),
    ),
  });
  if (revision === undefined) {
    throw new Error('Revision not found');
  }
  const entry = await requireEntry(organizationId, revision.entryId);

  let slug = entry.slug;
  if (revision.slug !== entry.slug) {
    const siblings = await db.query.contentEntry.findMany({
      where: eq(schema.contentEntry.typeId, entry.typeId),
      columns: { id: true, slug: true },
    });
    const taken = new Set(siblings.filter((row) => row.id !== entry.id).map((row) => row.slug));
    slug = uniqueSlug(slugify(revision.slug), taken);
  }
  const values = parseValues(revision.values);
  await db
    .update(schema.contentEntry)
    .set({
      title: revision.title,
      slug,
      values: revision.values,
      fieldText: valuesText(values),
      updatedAt: new Date(),
    })
    .where(eq(schema.contentEntry.id, entry.id));

  const bodies = JSON.parse(revision.bodies) as Record<string, string>;
  const saved = await loadDocument({ organizationId, page: entryPage(entry.id) });
  const currentKeys = saved === null ? [] : Object.keys(documentBodies(saved.doc));
  for (const fieldKey of new Set([...Object.keys(bodies), ...currentKeys])) {
    await writeEntryBody({
      organizationId,
      entryId: entry.id,
      fieldKey,
      markdown: bodies[fieldKey] ?? '',
    });
  }

  // Snapshot the restored state directly: the latest revision still holds the
  // pre-restore bodies, and the document's D1 mirror trails the room's flush.
  const after = await requireEntry(organizationId, entry.id);
  await writeRevision(after, revision.bodies, { userId: actor.userId, via: 'restore' });
  await recordAudit({
    organizationId,
    actor,
    action: 'entry.restore',
    subject: { type: 'entry', id: entry.id, label: revision.title },
    details: { revisionId: revision.id, revisionOf: revision.createdAt.toISOString() },
  });
  const type = await requireContentType(organizationId, entry.typeId);
  await recordContentChange(organizationId, {
    subject: 'entry',
    action: 'updated',
    id: entry.id,
    type: type.slug,
    slug,
    title: revision.title,
  });
  return { slug };
}
