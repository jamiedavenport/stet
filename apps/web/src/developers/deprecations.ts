import {
  completeFieldAction,
  countFieldActions,
  listFieldActions,
} from '@repo/content/deprecations';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { appActor } from '#/content/actor';
import { organizationMiddleware } from '#/session';

// Downstream field migrations and the completion that removes a retired key.
// Every organization member can act while the MVP has no narrower role.

const getActions = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => listFieldActions(context.organizationId));

const getActionCount = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => countFieldActions(context.organizationId));

export type ActionsData = Awaited<ReturnType<typeof getActions>>;

export const completeAction = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) =>
    completeFieldAction(context.organizationId, data.id, appActor(context.session.user.id)),
  );

export const actionsQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['field-actions', organizationId],
    queryFn: () => getActions(),
    staleTime: 30_000,
  });

export const actionCountQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['field-action-count', organizationId],
    queryFn: () => getActionCount(),
    staleTime: 30_000,
  });
