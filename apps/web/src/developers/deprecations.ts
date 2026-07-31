import { listDeprecatedFields, purgeField } from '@repo/content/deprecations';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appActor } from '#/content/actor';
import { organizationAdminMiddleware } from '#/session';

// The Danger Zone's data: the deleted fields whose keys and values the API is
// still serving, and the purge that ends that. Admin-only, like the rest of
// the developer pages.

const getDeprecations = createServerFn({ method: 'GET' })
  .middleware([organizationAdminMiddleware])
  .handler(async ({ context }) => listDeprecatedFields(context.organizationId));

export type DeprecationsData = Awaited<ReturnType<typeof getDeprecations>>;

export const purgeDeprecatedField = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) =>
    purgeField(context.organizationId, data.id, appActor(context.session.user.id)),
  );

export const deprecationsQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['deprecations', organizationId],
    queryFn: () => getDeprecations(),
    staleTime: 30_000,
  });
