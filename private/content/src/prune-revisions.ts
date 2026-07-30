import { database, schema, sql } from '@repo/db';

/**
 * Revisions an entry keeps. Beyond this its oldest are dropped, which is what
 * bounds the table: without a cap it grows with every edit forever.
 *
 * A per-entry cap rather than an age cutoff, because age would quietly leave
 * a rarely-edited entry with nothing to restore, while this leaves every entry
 * the same depth of history whether it was written yesterday or last year.
 */
export const revisionsKeptPerEntry = 50;

/**
 * Drops every entry's revisions past the newest `revisionsKeptPerEntry`.
 * Returns how many went.
 *
 * The keep-set is a window function rather than a read-then-delete loop: this
 * runs over every organization's revisions at once, and the per-entry index
 * makes the partition cheap.
 */
export async function pruneRevisions(): Promise<number> {
  const db = await database();
  const stale = sql`
    ${schema.contentRevision.id} not in (
      select id from (
        select id, row_number() over (
          partition by entry_id order by created_at desc
        ) as row_rank
        from content_revision
      ) where row_rank <= ${revisionsKeptPerEntry}
    )`;

  const removed = await db.$count(schema.contentRevision, stale);
  if (removed > 0) {
    await db.delete(schema.contentRevision).where(stale);
  }
  return removed;
}
