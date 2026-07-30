import { listEntryRevisions, restoreEntryRevision } from '@repo/content/revisions';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appActor } from '#/content/actor';
import { organizationMiddleware } from '#/session';

const getRevisions = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator(z.object({ entryId: z.string() }))
  .handler(async ({ data, context }) => listEntryRevisions(context.organizationId, data.entryId));

export type Revision = Awaited<ReturnType<typeof getRevisions>>[number];

export const revisionsQuery = (organizationId: string, entryId: string) =>
  queryOptions({
    queryKey: ['content-revisions', organizationId, entryId],
    queryFn: () => getRevisions({ data: { entryId } }),
    staleTime: 5_000,
  });

export const restoreRevision = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ revisionId: z.string() }))
  .handler(async ({ data, context }) =>
    restoreEntryRevision(
      context.organizationId,
      data.revisionId,
      appActor(context.session.user.id),
    ),
  );
