import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import * as fields from '@repo/content/fields';
import { fieldConfigSchema, fieldTypeSchema } from '@repo/content/schema';
import { appActor } from '#/content/actor';
import { organizationMiddleware } from '#/session';

export const createField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      typeId: z.string(),
      name: z.string().min(1).max(80),
      type: fieldTypeSchema,
      config: fieldConfigSchema.optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    fields.createField(context.organizationId, data, appActor(context.session.user.id)),
  );

export const updateField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(80).optional(),
      config: fieldConfigSchema.optional(),
      note: z.string().max(500).optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    fields.updateField(context.organizationId, data, appActor(context.session.user.id)),
  );

export const moveField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string(), direction: z.enum(['left', 'right']) }))
  .handler(async ({ data, context }) => fields.moveField(context.organizationId, data));

export const deleteField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string(), note: z.string().max(500).optional() }))
  .handler(async ({ data, context }) =>
    fields.deleteField(
      context.organizationId,
      data.id,
      appActor(context.session.user.id),
      data.note,
    ),
  );
