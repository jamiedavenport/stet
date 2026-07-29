import { and, asc, count, database, eq, inArray, schema } from '@repo/db';
import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { requireContentType } from '#/content/access';
import { entryPage } from '#/content/body/doc';
import { fieldTypeSchema, parseConfig } from '#/content/field/schema';
import { slugify, uniqueSlug } from '#/content/slug';
import { organizationMiddleware } from '#/session';

const getContentModel = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const db = await database();
    const types = await db.query.contentType.findMany({
      where: eq(schema.contentType.organizationId, context.organizationId),
      orderBy: asc(schema.contentType.createdAt),
    });
    const typeIds = types.map((type) => type.id);
    const fields =
      typeIds.length === 0
        ? []
        : await db.query.contentField.findMany({
            where: inArray(schema.contentField.typeId, typeIds),
            orderBy: asc(schema.contentField.position),
          });
    const counts =
      typeIds.length === 0
        ? []
        : await db
            .select({ typeId: schema.contentEntry.typeId, entries: count() })
            .from(schema.contentEntry)
            .where(eq(schema.contentEntry.organizationId, context.organizationId))
            .groupBy(schema.contentEntry.typeId);
    const entryCounts = new Map(counts.map((row) => [row.typeId, row.entries]));

    return {
      types: types.map((type) => ({
        id: type.id,
        slug: type.slug,
        name: type.name,
        kind: type.kind === 'map' ? ('map' as const) : ('collection' as const),
        entries: entryCounts.get(type.id) ?? 0,
        fields: fields
          .filter((field) => field.typeId === type.id)
          .map((field) => ({
            id: field.id,
            key: field.key,
            name: field.name,
            type: fieldTypeSchema.parse(field.type),
            config: parseConfig(field.config),
          })),
      })),
    };
  });

type ContentModelData = Awaited<ReturnType<typeof getContentModel>>;
type ModelType = ContentModelData['types'][number];
export type ModelField = ModelType['fields'][number];

export const contentModelQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['content-model', organizationId],
    queryFn: () => getContentModel(),
    staleTime: 30_000,
  });

export const ensureContentModel = (queryClient: QueryClient, organizationId: string) =>
  queryClient.ensureQueryData(contentModelQuery(organizationId));

/** Drizzle wraps driver errors, so the constraint text sits in the cause chain. */
function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current.message.includes('UNIQUE constraint failed')) {
      return true;
    }
  }
  return false;
}

export const createContentType = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ name: z.string().min(1).max(80), kind: z.enum(['collection', 'map']) }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const id = crypto.randomUUID();
    let slug = '';
    // Slug uniquing is read-then-insert, so two people creating at once can
    // compute the same slug; the unique index rejects the loser, who re-reads
    // and takes the next suffix.
    for (let attempt = 0; ; attempt += 1) {
      const existing = await db.query.contentType.findMany({
        where: eq(schema.contentType.organizationId, context.organizationId),
        columns: { slug: true },
      });
      slug = uniqueSlug(slugify(data.name), new Set(existing.map((type) => type.slug)));
      try {
        await db.insert(schema.contentType).values({
          id,
          organizationId: context.organizationId,
          slug,
          name: data.name,
          kind: data.kind,
          createdAt: new Date(),
        });
        break;
      } catch (error) {
        if (attempt >= 2 || !isUniqueViolation(error)) {
          throw error;
        }
      }
    }
    if (data.kind === 'map') {
      // A map is its one entry; create it with the type so it always exists.
      await db.insert(schema.contentEntry).values({
        id: crypto.randomUUID(),
        typeId: id,
        organizationId: context.organizationId,
        slug: 'default',
        title: data.name,
        values: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return { id, slug };
  });

export const updateContentType = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(80).optional(),
      slug: z.string().min(1).max(80).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await database();
    const type = await requireContentType(context.organizationId, data.id);
    let slug = type.slug;
    if (data.slug !== undefined && slugify(data.slug) !== type.slug) {
      const siblings = await db.query.contentType.findMany({
        where: eq(schema.contentType.organizationId, context.organizationId),
        columns: { slug: true },
      });
      const taken = new Set(siblings.map((row) => row.slug).filter((s) => s !== type.slug));
      slug = uniqueSlug(slugify(data.slug), taken);
    }
    await db
      .update(schema.contentType)
      .set({ name: data.name ?? type.name, slug })
      .where(eq(schema.contentType.id, type.id));
    return { slug };
  });

export const deleteContentType = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const type = await requireContentType(context.organizationId, data.id);
    // Entry rows cascade with the type; their body documents do not, so
    // collect them first.
    const entries = await db.query.contentEntry.findMany({
      where: eq(schema.contentEntry.typeId, type.id),
      columns: { id: true },
    });
    if (entries.length > 0) {
      await db.delete(schema.document).where(
        and(
          eq(schema.document.organizationId, context.organizationId),
          inArray(
            schema.document.page,
            entries.map((entry) => entryPage(entry.id)),
          ),
        ),
      );
    }
    await db.delete(schema.contentType).where(eq(schema.contentType.id, type.id));
  });
