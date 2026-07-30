import { eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { pruneRevisions, revisionsKeptPerEntry } from './prune-revisions';

const organizationId = 'org-1';
const now = new Date('2026-07-30T12:00:00Z');
const day = 24 * 60 * 60 * 1000;

let db: StetDatabase;

beforeEach(async () => {
  const sqlite = new Sqlite(':memory:');
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(schema),
  );
  for (const statement of statements) {
    sqlite.exec(statement);
  }
  db = drizzle(sqlite, { schema }) as unknown as StetDatabase;
  setDatabase(db);
  await db.insert(schema.organization).values({
    id: organizationId,
    name: 'Org One',
    slug: 'org-one',
    createdAt: now,
  });
  await db.insert(schema.contentType).values({
    id: 'type-1',
    organizationId,
    slug: 'posts',
    name: 'Posts',
    kind: 'collection',
    createdAt: now,
  });
});

/** An entry with `count` revisions, the newest first (index 0 is the oldest). */
async function seedRevisions(entryId: string, count: number): Promise<void> {
  await db.insert(schema.contentEntry).values({
    id: entryId,
    typeId: 'type-1',
    organizationId,
    slug: entryId,
    title: entryId,
    values: '{}',
    createdAt: now,
    updatedAt: now,
  });
  for (let index = 0; index < count; index += 1) {
    await db.insert(schema.contentRevision).values({
      id: `${entryId}-${index}`,
      entryId,
      organizationId,
      title: entryId,
      slug: entryId,
      values: '{}',
      bodies: '{}',
      authorId: null,
      via: 'app',
      createdAt: new Date(now.getTime() - (count - index) * day),
    });
  }
}

async function remaining(entryId: string): Promise<string[]> {
  const rows = await db.query.contentRevision.findMany({
    where: eq(schema.contentRevision.entryId, entryId),
  });
  return rows.map((row) => row.id);
}

describe('pruneRevisions', () => {
  it('leaves an entry under the cap alone, however old its revisions', async () => {
    await seedRevisions('entry-1', 3);
    expect(await pruneRevisions()).toBe(0);
    expect(await remaining('entry-1')).toHaveLength(3);
  });

  it('drops the oldest beyond the cap', async () => {
    await seedRevisions('entry-1', revisionsKeptPerEntry + 3);
    expect(await pruneRevisions()).toBe(3);

    const left = await remaining('entry-1');
    expect(left).toHaveLength(revisionsKeptPerEntry);
    // Indexes ascend with time, so the first three seeded are the oldest.
    expect(left).not.toContain('entry-1-0');
    expect(left).not.toContain('entry-1-2');
    expect(left).toContain('entry-1-3');
  });

  it('applies the cap per entry rather than across the table', async () => {
    await seedRevisions('entry-1', revisionsKeptPerEntry);
    await seedRevisions('entry-2', revisionsKeptPerEntry);
    expect(await pruneRevisions()).toBe(0);
    expect(await remaining('entry-1')).toHaveLength(revisionsKeptPerEntry);
    expect(await remaining('entry-2')).toHaveLength(revisionsKeptPerEntry);
  });

  it('prunes only the entry over the cap', async () => {
    await seedRevisions('entry-1', revisionsKeptPerEntry + 2);
    await seedRevisions('entry-2', 4);
    expect(await pruneRevisions()).toBe(2);
    expect(await remaining('entry-1')).toHaveLength(revisionsKeptPerEntry);
    expect(await remaining('entry-2')).toHaveLength(4);
  });
});
