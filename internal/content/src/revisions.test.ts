import { asc, eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { createEntry, updateEntry } from './entries';
import { createContentType } from './model';
import { listEntryRevisions, restoreEntryRevision } from './revisions';

const organizationId = 'org-1';
const writer = { userId: 'user-1', via: 'app' } as const;
const other = { userId: 'user-2', via: 'app' } as const;

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
    createdAt: new Date(),
  });
  for (const id of [writer.userId, other.userId]) {
    await db.insert(schema.user).values({
      id,
      name: id === writer.userId ? 'Ada' : 'Grace',
      email: `${id}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
});

/** A collection with one text field, and one entry in it. */
async function seedEntry() {
  const type = await createContentType(
    organizationId,
    { name: 'Posts', kind: 'collection' },
    writer,
  );
  await db.insert(schema.contentField).values({
    id: 'field-1',
    typeId: type.id,
    name: 'Summary',
    type: 'text',
    config: '{}',
    position: 0,
    createdAt: new Date(),
  });
  await db.insert(schema.contentFieldKey).values({
    id: 'key-1',
    fieldId: 'field-1',
    typeId: type.id,
    key: 'summary',
    status: 'canonical',
    createdAt: new Date(),
  });
  const entry = await createEntry(
    organizationId,
    { typeId: type.id, title: 'First light', values: { summary: 'Morning' } },
    writer,
  );
  return { type, entry };
}

describe('entry revisions', () => {
  it('snapshots an entry when it is created', async () => {
    const { entry } = await seedEntry();
    const revisions = await listEntryRevisions(organizationId, entry.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0].title).toBe('First light');
    expect(revisions[0].author?.name).toBe('Ada');
    expect(revisions[0].via).toBe('app');
  });

  it('folds one person’s run of edits into a single revision', async () => {
    const { entry } = await seedEntry();
    await updateEntry(organizationId, { id: entry.id, values: { summary: 'Noon' } }, writer);
    await updateEntry(organizationId, { id: entry.id, values: { summary: 'Dusk' } }, writer);

    const revisions = await listEntryRevisions(organizationId, entry.id);
    expect(revisions).toHaveLength(1);
    // Coalescing updates the snapshot in place, so it holds the latest state.
    const values = await db.query.contentRevision.findFirst({
      where: eq(schema.contentRevision.entryId, entry.id),
    });
    expect(JSON.parse(values?.values ?? '{}')).toEqual({ 'field-1': 'Dusk' });
  });

  it('starts a new revision when someone else edits', async () => {
    const { entry } = await seedEntry();
    await updateEntry(organizationId, { id: entry.id, values: { summary: 'Noon' } }, other);

    const revisions = await listEntryRevisions(organizationId, entry.id);
    expect(revisions).toHaveLength(2);
    expect(revisions[0].author?.name).toBe('Grace');
  });

  it('writes no revision when a write changes nothing', async () => {
    const { entry } = await seedEntry();
    await updateEntry(organizationId, { id: entry.id }, other);
    expect(await listEntryRevisions(organizationId, entry.id)).toHaveLength(1);
  });

  it('restores an earlier title and values, and records who restored', async () => {
    const { entry } = await seedEntry();
    const [original] = await listEntryRevisions(organizationId, entry.id);

    await updateEntry(
      organizationId,
      { id: entry.id, title: 'Second light', values: { summary: 'Rewritten' } },
      other,
    );

    await restoreEntryRevision(organizationId, original.id, writer);

    const restored = await db.query.contentEntry.findFirst({
      where: eq(schema.contentEntry.id, entry.id),
    });
    expect(restored?.title).toBe('First light');
    expect(JSON.parse(restored?.values ?? '{}')).toEqual({ 'field-1': 'Morning' });
    // The searchable mirror follows the restored values, not the replaced ones.
    expect(restored?.fieldText).toBe('Morning');

    const audit = await db.query.auditLog.findMany({
      where: eq(schema.auditLog.action, 'entry.restore'),
    });
    expect(audit).toHaveLength(1);
    expect(audit[0].actorId).toBe(writer.userId);
    expect(audit[0].via).toBe('app');
  });

  it('keeps the restore itself as the newest revision', async () => {
    const { entry } = await seedEntry();
    const [original] = await listEntryRevisions(organizationId, entry.id);
    await updateEntry(organizationId, { id: entry.id, title: 'Changed' }, other);

    await restoreEntryRevision(organizationId, original.id, writer);

    const revisions = await listEntryRevisions(organizationId, entry.id);
    expect(revisions[0].via).toBe('restore');
    expect(revisions[0].title).toBe('First light');
    // Restoring is not editing: the state it replaced stays restorable.
    expect(revisions.some((revision) => revision.title === 'Changed')).toBe(true);
  });

  it('lists revisions newest first', async () => {
    const { entry } = await seedEntry();
    await updateEntry(organizationId, { id: entry.id, title: 'Second' }, other);
    await updateEntry(organizationId, { id: entry.id, title: 'Third' }, writer);

    const revisions = await listEntryRevisions(organizationId, entry.id);
    const stored = await db.query.contentRevision.findMany({
      where: eq(schema.contentRevision.entryId, entry.id),
      orderBy: asc(schema.contentRevision.createdAt),
    });
    expect(revisions.map((revision) => revision.id)).toEqual(stored.map((row) => row.id).reverse());
  });
});
