import { and, asc, database, eq, inArray, schema } from '@repo/db';
import { loadDocument } from '@repo/realtime/document';
import { entryPage } from '@repo/realtime/entry';
import { ORPCError } from '@orpc/server';

import { keyed, os } from '#/api/implementer';
import { publicAssetUrl } from '#/files/urls';
import { fieldTypeSchema, isReferenceType, parseConfig, parseValues } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import { bodyContent } from '@repo/content/body';

type Deprecation = {
  reason: 'deleted' | 'renamed';
  at: string;
  by?: string;
  note?: string;
  renamedTo?: string;
};

type Field = {
  id: string;
  key: string;
  name: string;
  type: ReturnType<typeof fieldTypeSchema.parse>;
  options: { id: string; name: string; color: string }[];
  /** The content type a reference field points at; undefined for other types. */
  targetTypeId?: string;
  /** Set once the field is deleted from the model; its values live on. */
  deprecated?: Deprecation;
};

/** What ids in entry values resolve to, gathered once per request. */
type Targets = {
  people: Map<string, { id: string; name: string }>;
  entries: Map<string, { id: string; slug: string; title: string }>;
  assets: Map<string, PublicAsset>;
};

type PublicAsset = {
  id: string;
  url: string;
  name: string;
  contentType: string;
  size: number;
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
  return { ...type, fields: await loadModelFields(type.id) };
}

function toField(
  field: typeof schema.contentField.$inferSelect,
  key: typeof schema.contentFieldKey.$inferSelect,
  by: string | null,
  renamedTo: string | undefined,
): Field {
  const config = parseConfig(field.config);
  const deprecated =
    key.status === 'canonical'
      ? undefined
      : {
          reason: key.kind === 'renamed' ? ('renamed' as const) : ('deleted' as const),
          at: (key.deprecatedAt ?? new Date(0)).toISOString(),
          by: by ?? undefined,
          note: key.note ?? undefined,
          renamedTo: key.kind === 'renamed' ? renamedTo : undefined,
        };
  return {
    id: field.id,
    key: key.key,
    name: key.oldName ?? field.name,
    type: fieldTypeSchema.parse(field.type),
    options: config.options ?? [],
    targetTypeId: config.typeId,
    deprecated,
  };
}

/**
 * Every field the type has ever published, tombstones and all: a deleted one
 * stays as a deprecation so a regenerated client marks the key rather than
 * dropping it out from under code that reads it, and entries keep answering
 * with the last value it held. The deleter is joined in so the deprecation can
 * say who to ask about a key that has gone.
 *
 * Both the model and the entry routes read through here, which is what makes
 * a deletion cost a customer's running pages nothing: the key goes on
 * resolving until someone completes it under Developers → Actions.
 */
async function loadModelFields(typeId: string): Promise<Field[]> {
  const db = await database();
  const rows = await db
    .select({
      field: schema.contentField,
      key: schema.contentFieldKey,
      deprecatedByName: schema.user.name,
    })
    .from(schema.contentField)
    .innerJoin(schema.contentFieldKey, eq(schema.contentFieldKey.fieldId, schema.contentField.id))
    .leftJoin(schema.user, eq(schema.user.id, schema.contentFieldKey.deprecatedBy))
    .where(eq(schema.contentField.typeId, typeId))
    .orderBy(asc(schema.contentField.position));
  const targets = new Map<string, string>();
  for (const row of rows) {
    if (row.key.status === 'canonical' || row.key.kind === 'deleted') {
      targets.set(row.field.id, row.key.key);
    }
  }
  return rows.map(({ field, key, deprecatedByName }) =>
    toField(field, key, deprecatedByName, targets.get(field.id)),
  );
}

/**
 * The slugs of the collections these fields reference, by type id. The
 * generated client types a reference against the target's entry type, so the
 * model has to name it.
 */
async function loadReferenceSlugs(organizationId: string, fields: Field[]) {
  const ids = [
    ...new Set(
      fields
        .filter((field) => isReferenceType(field.type))
        .map((field) => field.targetTypeId)
        .filter((id): id is string => id !== undefined),
    ),
  ];
  if (ids.length === 0) {
    return new Map<string, string>();
  }
  const db = await database();
  const rows = await db
    .select({ id: schema.contentType.id, slug: schema.contentType.slug })
    .from(schema.contentType)
    .where(
      and(
        eq(schema.contentType.organizationId, organizationId),
        inArray(schema.contentType.id, ids),
      ),
    );
  return new Map(rows.map((row) => [row.id, row.slug]));
}

function publicType(
  type: { slug: string; name: string; kind: string; fields: Field[] },
  referenceSlugs: Map<string, string>,
) {
  return {
    slug: type.slug,
    name: type.name,
    kind: type.kind === 'map' ? ('map' as const) : ('collection' as const),
    fields: type.fields.map((field) => ({
      key: field.key,
      name: field.name,
      type: field.type,
      options: field.options.map((option) => ({ name: option.name, color: option.color })),
      collection:
        field.targetTypeId === undefined ? undefined : referenceSlugs.get(field.targetTypeId),
      deprecated: field.deprecated,
    })),
  };
}

/**
 * Everything the ids across these entries point at, in one query per kind:
 * people, referenced entries, and assets. Ids whose target is gone are simply
 * absent, and resolve to null.
 */
async function loadTargets(
  organizationId: string,
  rows: (typeof schema.contentEntry.$inferSelect)[],
  fields: Field[],
): Promise<Targets> {
  const people = new Set<string>();
  const entries = new Set<string>();
  const assets = new Set<string>();
  for (const row of rows) {
    const values = parseValues(row.values);
    for (const field of fields) {
      const value = values[field.id];
      if (field.type === 'person' && typeof value === 'string') {
        people.add(value);
      }
      if (field.type === 'asset' && typeof value === 'string') {
        assets.add(value);
      }
      if (isReferenceType(field.type)) {
        for (const id of typeof value === 'string' ? [value] : Array.isArray(value) ? value : []) {
          entries.add(id);
        }
      }
    }
  }

  const db = await database();
  const [userRows, entryRows, assetRows] = await Promise.all([
    people.size === 0
      ? []
      : db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user)
          .where(inArray(schema.user.id, [...people])),
    entries.size === 0
      ? []
      : db
          .select({
            id: schema.contentEntry.id,
            slug: schema.contentEntry.slug,
            title: schema.contentEntry.title,
          })
          .from(schema.contentEntry)
          .where(
            and(
              eq(schema.contentEntry.organizationId, organizationId),
              inArray(schema.contentEntry.id, [...entries]),
            ),
          ),
    assets.size === 0
      ? []
      : db
          .select({
            id: schema.asset.id,
            name: schema.asset.name,
            contentType: schema.asset.contentType,
            size: schema.asset.size,
            status: schema.asset.status,
          })
          .from(schema.asset)
          .where(
            and(
              eq(schema.asset.organizationId, organizationId),
              inArray(schema.asset.id, [...assets]),
            ),
          ),
  ]);

  return {
    people: new Map(userRows.map((row) => [row.id, { id: row.id, name: row.name }])),
    entries: new Map(entryRows.map((row) => [row.id, row])),
    assets: new Map(
      assetRows
        // A reservation whose bytes never arrived would serve a 404.
        .filter((row) => row.status === 'uploaded')
        .map((row) => [
          row.id,
          {
            id: row.id,
            url: publicAssetUrl(row.id),
            name: row.name,
            contentType: row.contentType,
            size: row.size,
          },
        ]),
    ),
  };
}

async function toApiEntry(
  organizationId: string,
  fields: Field[],
  row: typeof schema.contentEntry.$inferSelect,
  targets: Targets,
) {
  const values = parseValues(row.values);
  const hasBodies = fields.some((field) => field.type === 'rich_text');
  const saved = hasBodies ? await loadDocument({ organizationId, page: entryPage(row.id) }) : null;

  const resolved: Record<string, unknown> = {};
  for (const field of fields) {
    const value = resolveValue(field, values[field.id], targets);
    if (field.type === 'rich_text') {
      resolved[field.key] = saved === null ? null : bodyContent(saved.doc, field.id);
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

function resolveValue(field: Field, value: FieldValue | undefined, targets: Targets): unknown {
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
    return targets.people.get(value) ?? null;
  }
  if (field.type === 'asset' && typeof value === 'string') {
    return targets.assets.get(value) ?? null;
  }
  if (field.type === 'reference' && typeof value === 'string') {
    return targets.entries.get(value) ?? null;
  }
  if (field.type === 'multi_reference' && Array.isArray(value)) {
    // Deleted targets drop out rather than becoming nulls the customer has to
    // filter: the list is what still exists, in the order it was set.
    return value.map((id) => targets.entries.get(id)).filter((entry) => entry !== undefined);
  }
  return value;
}

const getContentModel = os.content.model.use(keyed).handler(async ({ context }) => {
  const db = await database();
  const types = await db.query.contentType.findMany({
    where: eq(schema.contentType.organizationId, context.organizationId),
    orderBy: [asc(schema.contentType.createdAt), asc(schema.contentType.slug)],
  });
  const withFields = await Promise.all(
    types.map(async (type) => ({ ...type, fields: await loadModelFields(type.id) })),
  );
  const referenceSlugs = await loadReferenceSlugs(
    context.organizationId,
    withFields.flatMap((type) => type.fields),
  );
  return { types: withFields.map((type) => publicType(type, referenceSlugs)) };
});

const listContent = os.content.list.use(keyed).handler(async ({ input, context }) => {
  const db = await database();
  const type = await loadType(context.organizationId, input.type);
  const rows = await db.query.contentEntry.findMany({
    where: eq(schema.contentEntry.typeId, type.id),
    orderBy: asc(schema.contentEntry.createdAt),
  });
  const [targets, referenceSlugs] = await Promise.all([
    loadTargets(context.organizationId, rows, type.fields),
    loadReferenceSlugs(context.organizationId, type.fields),
  ]);
  return {
    type: publicType(type, referenceSlugs),
    entries: await Promise.all(
      rows.map((row) => toApiEntry(context.organizationId, type.fields, row, targets)),
    ),
  };
});

const getContent = os.content.get.use(keyed).handler(async ({ input, context }) => {
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
  const targets = await loadTargets(context.organizationId, [row], type.fields);
  return toApiEntry(context.organizationId, type.fields, row, targets);
});

export const content = {
  model: getContentModel,
  list: listContent,
  get: getContent,
};
