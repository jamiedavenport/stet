import { recordAudit } from '@repo/audit';
import type { Actor } from '@repo/audit';
import { and, asc, count, database, eq, inArray, schema } from '@repo/db';
import { entryPage } from '@repo/realtime/entry';

import { requireContentType } from './access';
import { fieldTypeSchema, parseConfig } from './schema';
import { slugify, uniqueSlug } from './slug';

// Content model domain operations, shared by the server functions and the AI
// assistant's tools. Server-only, like ./access: callers authenticate,
// resolve the organization, and say who is acting before reaching them.

export async function readContentModel(organizationId: string) {
  const db = await database();
  const types = await db.query.contentType.findMany({
    where: eq(schema.contentType.organizationId, organizationId),
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
          .where(eq(schema.contentEntry.organizationId, organizationId))
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
}

type ContentModel = Awaited<ReturnType<typeof readContentModel>>;
export type ModelField = ContentModel['types'][number]['fields'][number];

/** Drizzle wraps driver errors, so the constraint text sits in the cause chain. */
function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current.message.includes('UNIQUE constraint failed')) {
      return true;
    }
  }
  return false;
}

export async function createContentType(
  organizationId: string,
  input: { name: string; kind: 'collection' | 'map' },
  actor: Actor,
): Promise<{ id: string; slug: string }> {
  const db = await database();
  const id = crypto.randomUUID();
  let slug = '';
  // Slug uniquing is read-then-insert, so two people creating at once can
  // compute the same slug; the unique index rejects the loser, who re-reads
  // and takes the next suffix.
  for (let attempt = 0; ; attempt += 1) {
    const existing = await db.query.contentType.findMany({
      where: eq(schema.contentType.organizationId, organizationId),
      columns: { slug: true },
    });
    slug = uniqueSlug(slugify(input.name), new Set(existing.map((type) => type.slug)));
    try {
      await db.insert(schema.contentType).values({
        id,
        organizationId,
        slug,
        name: input.name,
        kind: input.kind,
        createdAt: new Date(),
      });
      break;
    } catch (error) {
      if (attempt >= 2 || !isUniqueViolation(error)) {
        throw error;
      }
    }
  }
  if (input.kind === 'map') {
    // A map is its one entry; create it with the type so it always exists.
    await db.insert(schema.contentEntry).values({
      id: crypto.randomUUID(),
      typeId: id,
      organizationId,
      slug: 'default',
      title: input.name,
      values: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  await recordAudit({
    organizationId,
    actor,
    action: 'type.create',
    subject: { type: 'type', id, label: input.name },
    details: { kind: input.kind },
  });
  return { id, slug };
}

export async function updateContentType(
  organizationId: string,
  input: { id: string; name?: string; slug?: string },
  actor: Actor,
): Promise<{ slug: string }> {
  const db = await database();
  const type = await requireContentType(organizationId, input.id);
  let slug = type.slug;
  if (input.slug !== undefined && slugify(input.slug) !== type.slug) {
    const siblings = await db.query.contentType.findMany({
      where: eq(schema.contentType.organizationId, organizationId),
      columns: { slug: true },
    });
    const taken = new Set(siblings.map((row) => row.slug).filter((s) => s !== type.slug));
    slug = uniqueSlug(slugify(input.slug), taken);
  }
  await db
    .update(schema.contentType)
    .set({ name: input.name ?? type.name, slug })
    .where(eq(schema.contentType.id, type.id));
  const renamed = input.name !== undefined && input.name !== type.name;
  await recordAudit({
    organizationId,
    actor,
    action: 'type.update',
    subject: { type: 'type', id: type.id, label: input.name ?? type.name },
    details: renamed ? { from: type.name, to: input.name ?? type.name } : {},
    coalesceMs: 10 * 60_000,
  });
  return { slug };
}

export async function deleteContentType(
  organizationId: string,
  id: string,
  actor: Actor,
): Promise<void> {
  const db = await database();
  const type = await requireContentType(organizationId, id);
  // Entry rows cascade with the type; their body documents do not, so
  // collect them first.
  const entries = await db.query.contentEntry.findMany({
    where: eq(schema.contentEntry.typeId, type.id),
    columns: { id: true },
  });
  if (entries.length > 0) {
    await db.delete(schema.document).where(
      and(
        eq(schema.document.organizationId, organizationId),
        inArray(
          schema.document.page,
          entries.map((entry) => entryPage(entry.id)),
        ),
      ),
    );
  }
  await db.delete(schema.contentType).where(eq(schema.contentType.id, type.id));
  await recordAudit({
    organizationId,
    actor,
    action: 'type.delete',
    subject: { type: 'type', id: type.id, label: type.name },
    details: { kind: type.kind, entries: entries.length },
  });
}
