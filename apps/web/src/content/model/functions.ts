import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import * as model from '@repo/content/model';
import { appActor } from '#/content/actor';
import { organizationMiddleware } from '#/session';

export type { ModelField } from '@repo/content/model';

const getContentModel = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => model.readContentModel(context.organizationId));

export const contentModelQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['content-model', organizationId],
    queryFn: () => getContentModel(),
    staleTime: 30_000,
  });

export const ensureContentModel = (queryClient: QueryClient, organizationId: string) =>
  queryClient.ensureQueryData(contentModelQuery(organizationId));

export const createContentType = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ name: z.string().min(1).max(80), kind: z.enum(['collection', 'map']) }))
  .handler(async ({ data, context }) =>
    model.createContentType(context.organizationId, data, appActor(context.session.user.id)),
  );

export const updateContentType = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(80).optional(),
      slug: z.string().min(1).max(80).optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    model.updateContentType(context.organizationId, data, appActor(context.session.user.id)),
  );

export const deleteContentType = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) =>
    model.deleteContentType(context.organizationId, data.id, appActor(context.session.user.id)),
  );
