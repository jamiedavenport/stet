import { and, database, eq, inArray, schema } from '@repo/db';
import type { EntryValues, FieldType } from '@repo/content/schema';
import { isReferenceType } from '@repo/content/schema';

/**
 * Display data for values that are ids: referenced entry titles and asset
 * metadata. Built server-side next to the entries a page loads, so cells can
 * render names without a request per value.
 */
export type CellLookup = {
  /** Referenced entry id to its title. Deleted targets are simply absent. */
  entries: Record<string, string>;
  assets: Record<string, { name: string; contentType: string }>;
};

function collectIds(
  fields: { key: string; type: FieldType }[],
  rows: EntryValues[],
): { entryIds: string[]; assetIds: string[] } {
  const entryIds = new Set<string>();
  const assetIds = new Set<string>();
  for (const row of rows) {
    for (const field of fields) {
      const value = row[field.key];
      if (isReferenceType(field.type)) {
        if (typeof value === 'string') {
          entryIds.add(value);
        }
        if (Array.isArray(value)) {
          for (const id of value) {
            entryIds.add(id);
          }
        }
      }
      if (field.type === 'asset' && typeof value === 'string') {
        assetIds.add(value);
      }
    }
  }
  return { entryIds: [...entryIds], assetIds: [...assetIds] };
}

/** Resolves every reference and asset id the given rows hold, org-scoped. */
export async function buildCellLookup(
  organizationId: string,
  fields: { key: string; type: FieldType }[],
  rows: EntryValues[],
): Promise<CellLookup> {
  const { entryIds, assetIds } = collectIds(fields, rows);
  const db = await database();
  const [entryRows, assetRows] = await Promise.all([
    entryIds.length === 0
      ? []
      : db
          .select({ id: schema.contentEntry.id, title: schema.contentEntry.title })
          .from(schema.contentEntry)
          .where(
            and(
              eq(schema.contentEntry.organizationId, organizationId),
              inArray(schema.contentEntry.id, entryIds),
            ),
          ),
    assetIds.length === 0
      ? []
      : db
          .select({
            id: schema.asset.id,
            name: schema.asset.name,
            contentType: schema.asset.contentType,
          })
          .from(schema.asset)
          .where(
            and(
              eq(schema.asset.organizationId, organizationId),
              inArray(schema.asset.id, assetIds),
            ),
          ),
  ]);
  return {
    entries: Object.fromEntries(entryRows.map((row) => [row.id, row.title])),
    assets: Object.fromEntries(
      assetRows.map((row) => [row.id, { name: row.name, contentType: row.contentType }]),
    ),
  };
}
