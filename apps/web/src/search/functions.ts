import { and, database, eq, inArray, schema } from '@repo/db';
import { assetIndex, byRank, ftsSearch, userIndex } from '@repo/db/search';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';

import { organizationMiddleware } from '#/session';

/** Enough to fill the palette without pushing the actions off screen. */
const perKind = 5;

type FileResult = {
  kind: 'file';
  id: string;
  name: string;
  contentType: string;
};

type MemberResult = {
  kind: 'member';
  id: string;
  name: string;
  email: string;
  image: string | null;
};

/** One row of the result set, discriminated so the menu can group by kind. */
type SearchResult = FileResult | MemberResult;

/**
 * Everything in the active organization matching `query`.
 *
 * The FTS5 index only yields keys, so each kind is hydrated with an ordinary
 * Drizzle select. That is what keeps the rows typed, and it is where the
 * tenant scoping lives: the index spans the whole table, so a result only
 * survives if the row is also reachable from this organization.
 */
const search = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator((query: string) => query)
  .handler(async ({ data: query, context }): Promise<SearchResult[]> => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return [];
    }

    const [fileIds, memberIds] = await Promise.all([
      ftsSearch(assetIndex, trimmed, perKind),
      ftsSearch(userIndex, trimmed, perKind),
    ]);

    const db = await database();
    const [files, members] = await Promise.all([
      fileIds.length === 0
        ? []
        : db
            .select({
              id: schema.asset.id,
              name: schema.asset.name,
              contentType: schema.asset.contentType,
            })
            .from(schema.asset)
            .where(
              and(
                inArray(schema.asset.id, fileIds),
                eq(schema.asset.organizationId, context.organizationId),
                // Rows stay `pending` until R2 has the bytes; serving one
                // would 404.
                eq(schema.asset.status, 'uploaded'),
              ),
            ),
      memberIds.length === 0
        ? []
        : db
            .select({
              id: schema.user.id,
              name: schema.user.name,
              email: schema.user.email,
              image: schema.user.image,
            })
            .from(schema.user)
            .innerJoin(schema.member, eq(schema.member.userId, schema.user.id))
            .where(
              and(
                inArray(schema.user.id, memberIds),
                eq(schema.member.organizationId, context.organizationId),
              ),
            ),
    ]);

    return [
      ...files.sort(byRank(fileIds)).map((file): FileResult => ({ kind: 'file', ...file })),
      ...members
        .sort(byRank(memberIds))
        .map((member): MemberResult => ({ kind: 'member', ...member })),
    ];
  });

/**
 * Keyed by organization as well as text, so switching organizations never
 * serves another tenant's hits from the cache while the refetch is in flight.
 */
export const searchQuery = (organizationId: string, query: string) =>
  queryOptions({
    queryKey: ['search', organizationId, query],
    queryFn: () => search({ data: query }),
    enabled: query.trim().length > 0,
    // The palette refetches on every keystroke the debounce lets through;
    // holding results briefly makes backspacing instant.
    staleTime: 30_000,
  });
