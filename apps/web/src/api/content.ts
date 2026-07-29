import { and, asc, database, eq, inArray, schema } from '@repo/db';
import { loadDocument } from '@repo/realtime/document';
import { entryPage } from '@repo/realtime/entry';
import { ORPCError } from '@orpc/server';

import { authenticated, os } from '#/api/implementer';
import { fieldTypeSchema, parseConfig, parseValues } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import { bodyMarkdown } from '@repo/content/body';

type Field = {
  key: string;
  name: string;
  type: ReturnType<typeof fieldTypeSchema.parse>;
  options: { id: string; name: string; color: string }[];
};

async function loadType(organizationId: string, slug: string) {
  const db = await database();
  const type = await db.query.contentType.findFirst({
    where: and(
      eq(schema.contentType.organizationId, organizationId),
      eq(schema.contentType.slug, slug),
    ),
  });
  if (type === undefined) {
    throw new ORPCError('NOT_FOUND', {
      message: 'No content type with that slug in this organization.',
    });
  }
  return { ...type, fields: await loadFields(type.id) };
}

async function loadFields(typeId: string): Promise<Field[]> {
  const db = await database();
  const rows = await db.query.contentField.findMany({
    where: eq(schema.contentField.typeId, typeId),
    orderBy: asc(schema.contentField.position),
  });
  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    type: fieldTypeSchema.parse(row.type),
    options: parseConfig(row.config).options ?? [],
  }));
}

function publicType(type: { slug: string; name: string; kind: string; fields: Field[] }) {
  return {
    slug: type.slug,
    name: type.name,
    kind: type.kind === 'map' ? ('map' as const) : ('collection' as const),
    fields: type.fields.map((field) => ({
      key: field.key,
      name: field.name,
      type: field.type,
      options: field.options.map((option) => ({ name: option.name, color: option.color })),
    })),
  };
}

/** The people person fields across these entries point at, by user id. */
async function loadPeople(rows: (typeof schema.contentEntry.$inferSelect)[], fields: Field[]) {
  const personKeys = fields.filter((f) => f.type === 'person').map((f) => f.key);
  const ids = new Set<string>();
  for (const row of rows) {
    const values = parseValues(row.values);
    for (const key of personKeys) {
      const value = values[key];
      if (typeof value === 'string') {
        ids.add(value);
      }
    }
  }
  if (ids.size === 0) {
    return new Map<string, { id: string; name: string }>();
  }
  const db = await database();
  const users = await db.query.user.findMany({ where: inArray(schema.user.id, [...ids]) });
  return new Map(users.map((user) => [user.id, { id: user.id, name: user.name }]));
}

async function toApiEntry(
  organizationId: string,
  fields: Field[],
  row: typeof schema.contentEntry.$inferSelect,
  people: Map<string, { id: string; name: string }>,
) {
  const values = parseValues(row.values);
  const hasBodies = fields.some((field) => field.type === 'rich_text');
  const saved = hasBodies ? await loadDocument({ organizationId, page: entryPage(row.id) }) : null;

  const resolved: Record<string, unknown> = {};
  for (const field of fields) {
    const value = resolveValue(field, values[field.key], people);
    if (field.type === 'rich_text') {
      resolved[field.key] = saved === null ? null : bodyMarkdown(saved.doc, field.key);
    } else if (value !== undefined) {
      resolved[field.key] = value;
    }
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    fields: resolved,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function resolveValue(
  field: Field,
  value: FieldValue | undefined,
  people: Map<string, { id: string; name: string }>,
): unknown {
  if (value === undefined || value === null) {
    return value;
  }
  if (field.type === 'select' && typeof value === 'string') {
    return field.options.find((option) => option.id === value)?.name ?? null;
  }
  if (field.type === 'multi_select' && Array.isArray(value)) {
    return field.options.filter((option) => value.includes(option.id)).map((option) => option.name);
  }
  if (field.type === 'person' && typeof value === 'string') {
    return people.get(value) ?? null;
  }
  return value;
}

const getContentModel = os.content.model.use(authenticated).handler(async ({ context }) => {
  const db = await database();
  const types = await db.query.contentType.findMany({
    where: eq(schema.contentType.organizationId, context.organizationId),
    orderBy: asc(schema.contentType.createdAt),
  });
  return {
    types: await Promise.all(
      types.map(async (type) => publicType({ ...type, fields: await loadFields(type.id) })),
    ),
  };
});

const listContent = os.content.list.use(authenticated).handler(async ({ input, context }) => {
  const db = await database();
  const type = await loadType(context.organizationId, input.type);
  const rows = await db.query.contentEntry.findMany({
    where: eq(schema.contentEntry.typeId, type.id),
    orderBy: asc(schema.contentEntry.createdAt),
  });
  const people = await loadPeople(rows, type.fields);
  return {
    type: publicType(type),
    entries: await Promise.all(
      rows.map((row) => toApiEntry(context.organizationId, type.fields, row, people)),
    ),
  };
});

const getContent = os.content.get.use(authenticated).handler(async ({ input, context }) => {
  const db = await database();
  const type = await loadType(context.organizationId, input.type);
  const row = await db.query.contentEntry.findFirst({
    where: and(eq(schema.contentEntry.typeId, type.id), eq(schema.contentEntry.slug, input.slug)),
  });
  if (row === undefined) {
    throw new ORPCError('NOT_FOUND', {
      message: 'No such content type or entry in this organization.',
    });
  }
  const people = await loadPeople([row], type.fields);
  return toApiEntry(context.organizationId, type.fields, row, people);
});

export const content = {
  model: getContentModel,
  list: listContent,
  get: getContent,
};
