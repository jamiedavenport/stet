import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { eq, schema, setDatabase } from '../index.ts';
import type { Database } from '../index.ts';
import {
  assetIndex,
  byRank,
  ftsIndexes,
  ftsMatch,
  ftsSearch,
  ftsStatements,
  userIndex,
} from './index.ts';

let sqlite: Sqlite.Database;
let db: Database;
const orgId = 'org-1';
const now = new Date('2026-07-25T12:00:00.000Z');

async function addAsset(id: string, name: string) {
  await db.insert(schema.asset).values({
    id,
    key: `assets/${id}`,
    organizationId: orgId,
    kind: 'attachment',
    name,
    size: 10,
    contentType: 'text/plain',
    status: 'uploaded',
    createdAt: now,
  });
}

function applyIndexes() {
  for (const index of ftsIndexes) {
    for (const statement of ftsStatements(index)) {
      sqlite.exec(statement);
    }
  }
}

beforeEach(async () => {
  sqlite = new Sqlite(':memory:');
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(schema),
  );
  for (const statement of statements) {
    sqlite.exec(statement);
  }
  db = drizzle(sqlite, { schema }) as unknown as Database;
  setDatabase(db);
  await db.insert(schema.organization).values({
    id: orgId,
    name: 'Org One',
    slug: 'org-one',
    createdAt: now,
  });
});

describe('ftsMatch', () => {
  it('quotes each word and makes the last one a prefix', () => {
    expect(ftsMatch('quarterly report')).toBe('"quarterly" "report"*');
  });

  it('strips the punctuation FTS5 would read as syntax', () => {
    expect(ftsMatch('report.pdf OR "x"')).toBe('"report" "pdf" "OR" "x"*');
  });

  it('has nothing to match on for blank input', () => {
    expect(ftsMatch('   ')).toBeNull();
    expect(ftsMatch('***')).toBeNull();
  });
});

describe('ftsIndex', () => {
  it('reads table and column names off the schema', () => {
    expect(assetIndex).toMatchObject({ name: 'asset_fts', source: 'asset', id: 'id' });
    expect(assetIndex.columns).toEqual(['name']);
  });
});

describe('ftsSearch', () => {
  beforeEach(() => {
    applyIndexes();
  });

  it('matches on a word prefix', async () => {
    await addAsset('a1', 'quarterly report.pdf');
    await addAsset('a2', 'holiday photo.png');

    expect(await ftsSearch(assetIndex, 'quar', 10)).toEqual(['a1']);
    expect(await ftsSearch(assetIndex, 'report', 10)).toEqual(['a1']);
    expect(await ftsSearch(assetIndex, 'photo', 10)).toEqual(['a2']);
  });

  it('requires every word to match', async () => {
    await addAsset('a1', 'quarterly report.pdf');

    expect(await ftsSearch(assetIndex, 'quarterly report', 10)).toEqual(['a1']);
    expect(await ftsSearch(assetIndex, 'quarterly budget', 10)).toEqual([]);
  });

  it('honours the limit', async () => {
    await addAsset('a1', 'report one');
    await addAsset('a2', 'report two');
    await addAsset('a3', 'report three');

    expect(await ftsSearch(assetIndex, 'report', 2)).toHaveLength(2);
  });

  it('returns nothing rather than throwing on unmatchable input', async () => {
    await addAsset('a1', 'quarterly report.pdf');

    expect(await ftsSearch(assetIndex, '   ', 10)).toEqual([]);
  });

  it('follows renames through the update trigger', async () => {
    await addAsset('a1', 'quarterly report.pdf');
    await db
      .update(schema.asset)
      .set({ name: 'annual summary.pdf' })
      .where(eq(schema.asset.id, 'a1'));

    expect(await ftsSearch(assetIndex, 'quarterly', 10)).toEqual([]);
    expect(await ftsSearch(assetIndex, 'summary', 10)).toEqual(['a1']);
  });

  it('drops deleted rows through the delete trigger', async () => {
    await addAsset('a1', 'quarterly report.pdf');
    await db.delete(schema.asset).where(eq(schema.asset.id, 'a1'));

    expect(await ftsSearch(assetIndex, 'quarterly', 10)).toEqual([]);
  });

  it('searches every indexed column', async () => {
    await db.insert(schema.user).values({
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      emailVerified: true,
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    });

    expect(await ftsSearch(userIndex, 'lovelace', 10)).toEqual(['u1']);
    expect(await ftsSearch(userIndex, 'ada@example.com', 10)).toEqual(['u1']);
  });
});

describe('ftsStatements', () => {
  it('indexes rows that predate the index', async () => {
    await addAsset('a1', 'quarterly report.pdf');
    applyIndexes();

    expect(await ftsSearch(assetIndex, 'quarterly', 10)).toEqual(['a1']);
  });

  it('can be applied repeatedly', async () => {
    applyIndexes();
    await addAsset('a1', 'quarterly report.pdf');
    applyIndexes();

    expect(await ftsSearch(assetIndex, 'quarterly', 10)).toEqual(['a1']);
  });
});

describe('byRank', () => {
  it('restores the order a lookup by key loses', () => {
    const rows = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];

    expect(rows.sort(byRank(['a', 'b', 'c']))).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });
});
