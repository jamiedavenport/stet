import { and, asc, database, eq, schema } from '@repo/db';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { notFound } from '@tanstack/react-router';
import { z } from 'zod';

import { liveFields } from '@repo/content/access';
import * as entries from '@repo/content/entries';
import { fieldTypeSchema, fieldValueSchema, parseConfig, parseValues } from '@repo/content/schema';
import { appActor } from '#/content/actor';
import { buildCellLookup } from '#/content/cells/lookup';
import { organizationMiddleware } from '#/session';

async function typeWithFields(organizationId: string, where: { slug?: string; id?: string }) {
  const db = await database();
  const type = await db.query.contentType.findFirst({
    where: and(
      eq(schema.contentType.organizationId, organizationId),
      where.slug === undefined
        ? eq(schema.contentType.id, where.id ?? '')
        : eq(schema.contentType.slug, where.slug),
    ),
  });
  if (type === undefined) {
    throw notFound();
  }
  const fields = await liveFields(type.id);
  return {
    id: type.id,
    slug: type.slug,
    name: type.name,
    kind: type.kind === 'map' ? ('map' as const) : ('collection' as const),
    fields: fields.map((field) => ({
      id: field.id,
      key: field.key,
      name: field.name,
      type: fieldTypeSchema.parse(field.type),
      config: parseConfig(field.config),
    })),
  };
}

function toEntry(row: typeof schema.contentEntry.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    values: parseValues(row.values),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const getEntries = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator(z.object({ typeSlug: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const type = await typeWithFields(context.organizationId, { slug: data.typeSlug });
    const rows = await db.query.contentEntry.findMany({
      where: eq(schema.contentEntry.typeId, type.id),
      orderBy: asc(schema.contentEntry.createdAt),
    });
    const mapped = rows.map(toEntry);
    const lookup = await buildCellLookup(
      context.organizationId,
      type.fields,
      mapped.map((entry) => entry.values),
    );
    return { type, entries: mapped, lookup };
  });

type EntriesData = Awaited<ReturnType<typeof getEntries>>;
export type EntryRow = EntriesData['entries'][number];
export type EntryType = EntriesData['type'];

export const entriesQuery = (organizationId: string, typeSlug: string) =>
  queryOptions({
    queryKey: ['content-entries', organizationId, typeSlug],
    queryFn: () => getEntries({ data: { typeSlug } }),
    staleTime: 30_000,
  });

const getEntry = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator(z.object({ entryId: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const row = await db.query.contentEntry.findFirst({
      where: and(
        eq(schema.contentEntry.id, data.entryId),
        eq(schema.contentEntry.organizationId, context.organizationId),
      ),
    });
    if (row === undefined) {
      throw notFound();
    }
    const type = await typeWithFields(context.organizationId, { id: row.typeId });
    const entry = toEntry(row);
    const lookup = await buildCellLookup(context.organizationId, type.fields, [entry.values]);
    return { type, entry, lookup };
  });

export type EntryData = Awaited<ReturnType<typeof getEntry>>;

export const entryQuery = (organizationId: string, entryId: string) =>
  queryOptions({
    queryKey: ['content-entry', organizationId, entryId],
    queryFn: () => getEntry({ data: { entryId } }),
    staleTime: 30_000,
  });

/** The map's one entry, addressed by the type rather than an entry id. */
const getMapEntry = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator(z.object({ typeSlug: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const type = await typeWithFields(context.organizationId, { slug: data.typeSlug });
    if (type.kind !== 'map') {
      throw notFound();
    }
    const row = await db.query.contentEntry.findFirst({
      where: eq(schema.contentEntry.typeId, type.id),
    });
    if (row === undefined) {
      throw notFound();
    }
    const entry = toEntry(row);
    const lookup = await buildCellLookup(context.organizationId, type.fields, [entry.values]);
    return { type, entry, lookup };
  });

export const mapEntryQuery = (organizationId: string, typeSlug: string) =>
  queryOptions({
    queryKey: ['content-map', organizationId, typeSlug],
    queryFn: () => getMapEntry({ data: { typeSlug } }),
    staleTime: 30_000,
  });

export const createEntry = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ typeId: z.string(), title: z.string().max(200).optional() }))
  .handler(async ({ data, context }) =>
    entries.createEntry(context.organizationId, data, appActor(context.session.user.id)),
  );

export const updateEntry = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(200).optional(),
      slug: z.string().min(1).max(200).optional(),
      values: z.record(z.string(), fieldValueSchema).optional(),
    }),
  )
  .handler(async ({ data, context }) =>
    entries.updateEntry(context.organizationId, data, appActor(context.session.user.id)),
  );

export const deleteEntry = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) =>
    entries.deleteEntry(context.organizationId, data.id, appActor(context.session.user.id)),
  );

/** Members of the organization, for person fields and presence labels. */
const getMembers = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const db = await database();
    const rows = await db
      .select({ id: schema.user.id, name: schema.user.name, image: schema.user.image })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.user.id, schema.member.userId))
      .where(eq(schema.member.organizationId, context.organizationId));
    return rows.map((row) => ({ id: row.id, name: row.name, image: row.image ?? null }));
  });

export type Member = Awaited<ReturnType<typeof getMembers>>[number];

export const membersQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['content-members', organizationId],
    queryFn: () => getMembers(),
    staleTime: 60_000,
  });
