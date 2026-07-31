import { sql } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { database } from '../index.ts';

type ColumnOf<TTable extends SQLiteTable> = TTable['_']['columns'][keyof TTable['_']['columns']];

/** Only text columns can be tokenized, and only a text key can be looked up again. */
type TextColumnOf<TTable extends SQLiteTable> = Extract<ColumnOf<TTable>, { _: { data: string } }>;

/**
 * An FTS5 virtual table mirroring one Drizzle table. Column and table names
 * are read off the schema objects, so a rename in `src/schema` moves the
 * index with it.
 */
export type FtsIndex = {
  /** The virtual table, always `<source>_fts`. */
  readonly name: string;
  /** The table it indexes. */
  readonly source: string;
  /** Primary key column, stored UNINDEXED so searches return it directly. */
  readonly id: string;
  /** Tokenized columns, in declaration order. */
  readonly columns: readonly string[];
};

/**
 * Declares a full-text index over `columns` of `table`.
 *
 * Drizzle Kit does not manage virtual tables, so nothing here reaches D1 by
 * itself: `pnpm push` runs `scripts/push-fts.ts` afterwards to apply the
 * statements below.
 */
export function ftsIndex<TTable extends SQLiteTable>(config: {
  table: TTable;
  id: TextColumnOf<TTable>;
  columns: readonly [TextColumnOf<TTable>, ...TextColumnOf<TTable>[]];
}): FtsIndex {
  const source = getTableConfig(config.table).name;
  return {
    name: `${source}_fts`,
    source,
    id: config.id.name,
    columns: config.columns.map((column) => column.name),
  };
}

/**
 * The virtual table, the three triggers that keep it in step with the source
 * table, and a reindex of the rows already there.
 *
 * The index is dropped and rebuilt rather than altered, because `CREATE ... IF
 * NOT EXISTS` would leave an index built from an older set of columns in
 * place and silently return stale results.
 */
export function ftsStatements(index: FtsIndex): string[] {
  const columns = [index.id, ...index.columns];
  const list = columns.join(', ');
  const inserted = columns.map((column) => `new.${column}`).join(', ');
  // FTS5 removes an external-content row by being handed the values it was
  // indexed under, so deletes and updates replay the old row.
  const deleted = `'delete', old.rowid, ${columns.map((column) => `old.${column}`).join(', ')}`;
  const trigger = (event: string, body: string) =>
    `CREATE TRIGGER ${index.name}_${event} AFTER ${event.toUpperCase()} ON ${index.source} BEGIN ${body} END`;
  const insert = `INSERT INTO ${index.name}(rowid, ${list}) VALUES (new.rowid, ${inserted});`;
  const remove = `INSERT INTO ${index.name}(${index.name}, rowid, ${list}) VALUES (${deleted});`;

  return [
    ...['insert', 'delete', 'update'].map(
      (event) => `DROP TRIGGER IF EXISTS ${index.name}_${event}`,
    ),
    `DROP TABLE IF EXISTS ${index.name}`,
    `CREATE VIRTUAL TABLE ${index.name} USING fts5(${index.id} UNINDEXED, ${index.columns.join(', ')}, content='${index.source}', content_rowid='rowid')`,
    trigger('insert', insert),
    trigger('delete', remove),
    trigger('update', `${remove} ${insert}`),
    `INSERT INTO ${index.name}(${index.name}) VALUES ('rebuild')`,
  ];
}

/**
 * Turns what someone typed into an FTS5 MATCH expression. Bare input is a
 * query language of its own, where `AND`, `*` and an odd `"` are all syntax
 * errors, so each word is quoted and the last one made a prefix to keep
 * results useful mid-word. Returns null when there is nothing to match on.
 */
export function ftsMatch(input: string): string | null {
  const words = input.match(/[\p{L}\p{N}]+/gu);
  if (words === null) {
    return null;
  }
  return words.map((word, i) => (i === words.length - 1 ? `"${word}"*` : `"${word}"`)).join(' ');
}

/**
 * The keys of the best `limit` matches for `query`, best first. Callers turn
 * these into rows with a normal Drizzle select, which is what keeps the
 * result typed and lets them apply their own tenant scoping.
 */
export async function ftsSearch(index: FtsIndex, query: string, limit: number): Promise<string[]> {
  const match = ftsMatch(query);
  if (match === null) {
    return [];
  }
  const table = sql.identifier(index.name);
  const db = await database();
  const rows = await db.all<{ id: string }>(
    sql`SELECT ${sql.identifier(index.id)} AS id FROM ${table} WHERE ${table} MATCH ${match} ORDER BY bm25(${table}) LIMIT ${limit}`,
  );
  return rows.map((row) => row.id);
}

/**
 * Sorts hydrated rows back into the order `ftsSearch` returned, which a
 * `where in (...)` lookup does not preserve.
 */
export function byRank<T extends { id: string }>(ids: readonly string[]): (a: T, b: T) => number {
  const rank = new Map(ids.map((id, position) => [id, position]));
  return (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0);
}
