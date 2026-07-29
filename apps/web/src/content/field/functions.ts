import { asc, database, eq, schema } from '@repo/db';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { requireContentType, requireField } from '#/content/access';
import { fieldConfigSchema, fieldTypeSchema } from '#/content/field/schema';
import { slugify, uniqueSlug } from '#/content/slug';
import { organizationMiddleware } from '#/session';

export const createField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({ typeId: z.string(), name: z.string().min(1).max(80), type: fieldTypeSchema }),
  )
  .handler(async ({ data, context }) => {
    const db = await database();
    const type = await requireContentType(context.organizationId, data.typeId);
    const siblings = await db.query.contentField.findMany({
      where: eq(schema.contentField.typeId, type.id),
      columns: { key: true, position: true },
    });
    const key = uniqueSlug(slugify(data.name, '_'), new Set(siblings.map((f) => f.key)), '_');
    const id = crypto.randomUUID();
    await db.insert(schema.contentField).values({
      id,
      typeId: type.id,
      key,
      name: data.name,
      type: data.type,
      config: '{}',
      position: siblings.length === 0 ? 0 : Math.max(...siblings.map((f) => f.position)) + 1,
      createdAt: new Date(),
    });
    return { id, key };
  });

export const updateField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(80).optional(),
      config: fieldConfigSchema.optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await database();
    const field = await requireField(context.organizationId, data.id);
    await db
      .update(schema.contentField)
      .set({
        name: data.name ?? field.name,
        config: data.config === undefined ? field.config : JSON.stringify(data.config),
      })
      .where(eq(schema.contentField.id, field.id));
  });

export const moveField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string(), direction: z.enum(['left', 'right']) }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const field = await requireField(context.organizationId, data.id);
    const siblings = await db.query.contentField.findMany({
      where: eq(schema.contentField.typeId, field.typeId),
      orderBy: asc(schema.contentField.position),
    });
    const index = siblings.findIndex((sibling) => sibling.id === field.id);
    const neighbor = siblings[data.direction === 'left' ? index - 1 : index + 1];
    if (neighbor === undefined) {
      return;
    }
    await db
      .update(schema.contentField)
      .set({ position: neighbor.position })
      .where(eq(schema.contentField.id, field.id));
    await db
      .update(schema.contentField)
      .set({ position: field.position })
      .where(eq(schema.contentField.id, neighbor.id));
  });

export const deleteField = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const field = await requireField(context.organizationId, data.id);
    // Stale keys left in entry values are dropped on read, so entries are
    // not rewritten here.
    await db.delete(schema.contentField).where(eq(schema.contentField.id, field.id));
  });
