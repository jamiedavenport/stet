import { and, asc, database, eq, inArray, schema } from '@repo/db';
import { byRank, entryIndex, ftsSearch } from '@repo/db/search';
import { loadLiveDocument } from '@repo/realtime/document';
import { entryPage } from '@repo/realtime/entry';
import { liveFields } from '@repo/content/access';
import { bodyMarkdown } from '@repo/content/body';
import { readContentModel } from '@repo/content/model';
import { fieldTypeSchema, parseConfig, parseValues } from '@repo/content/schema';
import { tool } from 'ai';
import type { ToolSet } from 'ai';
import { z } from 'zod';

/** Enough for the model to pick from without flooding its context. */
const listLimit = 100;
const searchLimit = 10;

/**
 * Read-only tools, org-scoped by the caller. These never ask for approval:
 * they can only see what the user already sees.
 */
export function contentReadTools(organizationId: string): ToolSet {
  return {
    getContentModel: tool({
      description:
        'The content model: every collection and map with its fields (ids, keys, types, ' +
        'select options) and entry counts. Read this before creating or changing anything.',
      inputSchema: z.object({}),
      execute: async () => readContentModel(organizationId),
    }),

    listEntries: tool({
      description: `Entries of one collection or map by type slug, newest first, up to ${listLimit}. Titles and ids only; use getEntry for content.`,
      inputSchema: z.object({ type: z.string().describe('The collection or map slug') }),
      execute: async ({ type: typeSlug }) => {
        const db = await database();
        const type = await db.query.contentType.findFirst({
          where: and(
            eq(schema.contentType.organizationId, organizationId),
            eq(schema.contentType.slug, typeSlug),
          ),
        });
        if (type === undefined) {
          return { error: `No collection or map has the slug "${typeSlug}".` };
        }
        const rows = await db.query.contentEntry.findMany({
          where: eq(schema.contentEntry.typeId, type.id),
          orderBy: asc(schema.contentEntry.createdAt),
          limit: listLimit,
        });
        return {
          type: { id: type.id, slug: type.slug, name: type.name, kind: type.kind },
          entries: rows.map((row) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            updatedAt: row.updatedAt.toISOString(),
          })),
        };
      },
    }),

    getEntry: tool({
      description:
        'One entry in full: field values plus every rich text body as markdown. ' +
        'Use listEntries or searchContent to find the id.',
      inputSchema: z.object({ entryId: z.string() }),
      execute: async ({ entryId }) => {
        const db = await database();
        const row = await db.query.contentEntry.findFirst({
          where: and(
            eq(schema.contentEntry.id, entryId),
            eq(schema.contentEntry.organizationId, organizationId),
          ),
        });
        if (row === undefined) {
          return { error: 'No entry has that id.' };
        }
        const [type, fields] = await Promise.all([
          db.query.contentType.findFirst({ where: eq(schema.contentType.id, row.typeId) }),
          liveFields(row.typeId),
        ]);
        const richText = fields.filter(
          (field) => fieldTypeSchema.parse(field.type) === 'rich_text',
        );
        // Live rather than the D1 mirror, so a body written moments ago (by
        // anyone, including this agent) reads back immediately.
        const doc =
          richText.length === 0
            ? null
            : await loadLiveDocument({ organizationId, page: entryPage(row.id) });
        const bodies: Record<string, string | null> = {};
        for (const field of richText) {
          bodies[field.key] = doc === null ? null : bodyMarkdown(doc, field.key);
        }
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          type: type === undefined ? null : { id: type.id, slug: type.slug, name: type.name },
          fields: fields.map((field) => ({
            key: field.key,
            name: field.name,
            type: field.type,
            config: parseConfig(field.config),
          })),
          values: parseValues(row.values),
          bodies,
          updatedAt: row.updatedAt.toISOString(),
        };
      },
    }),

    searchContent: tool({
      description:
        'Full-text search over every entry in the organization: titles, field values, and ' +
        'rich text bodies. Returns the best matches with their entry ids.',
      inputSchema: z.object({ query: z.string().min(1) }),
      execute: async ({ query }) => {
        const ids = await ftsSearch(entryIndex, query, searchLimit);
        if (ids.length === 0) {
          return { results: [] };
        }
        const db = await database();
        const rows = await db
          .select({
            id: schema.contentEntry.id,
            title: schema.contentEntry.title,
            slug: schema.contentEntry.slug,
            typeSlug: schema.contentType.slug,
            typeName: schema.contentType.name,
          })
          .from(schema.contentEntry)
          .innerJoin(schema.contentType, eq(schema.contentType.id, schema.contentEntry.typeId))
          .where(
            and(
              inArray(schema.contentEntry.id, ids),
              eq(schema.contentEntry.organizationId, organizationId),
            ),
          );
        return { results: rows.sort(byRank(ids)) };
      },
    }),
  };
}
