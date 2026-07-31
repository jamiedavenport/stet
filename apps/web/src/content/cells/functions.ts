import { desc, like, and, database, eq, schema } from '@repo/db';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { organizationMiddleware } from '#/session';

/**
 * Entries a reference field can point at: the target collection's entries,
 * newest first, narrowed by a title search once the list is worth narrowing.
 */
const getReferenceCandidates = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator(z.object({ typeId: z.string(), search: z.string().max(200) }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const conditions = [
      eq(schema.contentEntry.typeId, data.typeId),
      eq(schema.contentEntry.organizationId, context.organizationId),
    ];
    if (data.search.trim().length > 0) {
      conditions.push(like(schema.contentEntry.title, `%${data.search.trim()}%`));
    }
    const rows = await db
      .select({ id: schema.contentEntry.id, title: schema.contentEntry.title })
      .from(schema.contentEntry)
      .where(and(...conditions))
      .orderBy(desc(schema.contentEntry.updatedAt))
      .limit(20);
    return rows;
  });

export const referenceCandidatesQuery = (organizationId: string, typeId: string, search: string) =>
  queryOptions({
    queryKey: ['reference-candidates', organizationId, typeId, search],
    queryFn: () => getReferenceCandidates({ data: { typeId, search } }),
    staleTime: 15_000,
  });
