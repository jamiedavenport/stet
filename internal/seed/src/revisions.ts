import type { EntryValues } from '@repo/content/schema';
import { schema } from '@repo/db';

import type { Db } from './db';

// Version history for the seeded entries. `@repo/content` snapshots an entry
// on every write; the seed writes the snapshots those writes would have left,
// so the History panel opens onto something it can restore.

export type SeedRevision = {
  /** Distinguishes this snapshot's row id from the entry's other snapshots. */
  suffix: string;
  title: string;
  slug: string;
  values: EntryValues;
  /** Rich text field key to markdown, as `contentRevision.bodies` holds it. */
  bodies: Record<string, string>;
  authorId: string | null;
  /** A `Via` from `@repo/audit`: `editor` for a body, `app` for the entry. */
  via: string;
  createdAt: Date;
};

export function writeRevisions(
  db: Db,
  organizationId: string,
  entryId: string,
  revisions: SeedRevision[],
): void {
  db.insert(schema.contentRevision)
    .values(
      revisions.map((revision) => ({
        id: `${entryId}-${revision.suffix}`,
        entryId,
        organizationId,
        title: revision.title,
        slug: revision.slug,
        values: JSON.stringify(revision.values),
        bodies: JSON.stringify(revision.bodies),
        authorId: revision.authorId,
        via: revision.via,
        createdAt: revision.createdAt,
      })),
    )
    .run();
}
