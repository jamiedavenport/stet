import { database, desc, eq, inArray, schema } from '@repo/db';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';

import { organizationMiddleware } from '#/session';

/** How many entries the home page shows; two rows of the widest grid. */
const recentEntryCount = 6;

/**
 * The organization's most recently edited entries with the metadata the home
 * page cards show: which type they belong to and who touched them last. The
 * editor comes from the latest revision because `contentEntry` itself does
 * not record an author.
 */
const getRecentEntries = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const db = await database();
    const rows = await db
      .select({
        id: schema.contentEntry.id,
        title: schema.contentEntry.title,
        createdAt: schema.contentEntry.createdAt,
        updatedAt: schema.contentEntry.updatedAt,
        typeSlug: schema.contentType.slug,
        typeName: schema.contentType.name,
        typeKind: schema.contentType.kind,
      })
      .from(schema.contentEntry)
      .innerJoin(schema.contentType, eq(schema.contentType.id, schema.contentEntry.typeId))
      .where(eq(schema.contentEntry.organizationId, context.organizationId))
      .orderBy(desc(schema.contentEntry.updatedAt))
      .limit(recentEntryCount);

    // One indexed lookup per entry (content_revision_entry_idx) rather than a
    // scan of every revision the entries have accumulated.
    const revisions = await Promise.all(
      rows.map((row) =>
        db.query.contentRevision.findFirst({
          columns: { entryId: true, authorId: true },
          where: eq(schema.contentRevision.entryId, row.id),
          orderBy: desc(schema.contentRevision.createdAt),
        }),
      ),
    );

    const authorIds = [
      ...new Set(
        revisions
          .map((revision) => revision?.authorId)
          .filter((authorId): authorId is string => typeof authorId === 'string'),
      ),
    ];
    let authors: { id: string; name: string; image: string | null }[] = [];
    if (authorIds.length > 0) {
      authors = await db
        .select({ id: schema.user.id, name: schema.user.name, image: schema.user.image })
        .from(schema.user)
        .where(inArray(schema.user.id, authorIds));
    }
    const authorById = new Map(authors.map((author) => [author.id, author]));
    const editorByEntry = new Map(
      revisions
        .filter((revision) => revision !== undefined)
        .map((revision) => [revision.entryId, authorById.get(revision.authorId ?? '')]),
    );

    return rows.map((row) => {
      const author = editorByEntry.get(row.id);
      let editor: { name: string; image: string | null } | null = null;
      if (author !== undefined) {
        editor = { name: author.name, image: author.image ?? null };
      }
      return {
        id: row.id,
        title: row.title,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        type: {
          slug: row.typeSlug,
          name: row.typeName,
          kind: row.typeKind === 'map' ? ('map' as const) : ('collection' as const),
        },
        editor,
      };
    });
  });

export type RecentEntry = Awaited<ReturnType<typeof getRecentEntries>>[number];

export const recentEntriesQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['home-recent-entries', organizationId],
    queryFn: () => getRecentEntries(),
    staleTime: 30_000,
  });
