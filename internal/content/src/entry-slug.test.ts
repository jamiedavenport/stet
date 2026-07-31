import { eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { createEntry, updateEntry } from './entries';
import { createContentType } from './model';

// A slug is an entry's public handle, so when a rename moves it and when a
// rename leaves it alone are both worth holding still.

const organizationId = 'org-1';
const writer = { userId: 'user-1', via: 'app' } as const;

let db: StetDatabase;
let typeId: string;

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
  await db.insert(schema.user).values({
    id: writer.userId,
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const type = await createContentType(
    organizationId,
    { name: 'Posts', kind: 'collection' },
    writer,
  );
  typeId = type.id;
});

async function slugOf(id: string): Promise<string> {
  const row = await db.query.contentEntry.findFirst({
    where: eq(schema.contentEntry.id, id),
    columns: { slug: true },
  });
  return row?.slug ?? '';
}

describe('slug follows the title', () => {
  it('moves a slug nobody has edited', async () => {
    const entry = await createEntry(organizationId, { typeId, title: 'Draft post' }, writer);
    expect(entry.slug).toBe('draft-post');

    const updated = await updateEntry(
      organizationId,
      { id: entry.id, title: 'Hello world' },
      writer,
    );

    expect(updated.slug).toBe('hello-world');
    expect(await slugOf(entry.id)).toBe('hello-world');
  });

  it('fills in the placeholder an untitled entry starts with', async () => {
    const entry = await createEntry(organizationId, { typeId }, writer);
    expect(entry.slug).toBe('untitled');

    await updateEntry(organizationId, { id: entry.id, title: 'Now it has a name' }, writer);

    expect(await slugOf(entry.id)).toBe('now-it-has-a-name');
  });

  it('leaves a slug alone once somebody has chosen it', async () => {
    const entry = await createEntry(organizationId, { typeId, title: 'Hello world' }, writer);
    await updateEntry(organizationId, { id: entry.id, slug: 'hello' }, writer);

    await updateEntry(organizationId, { id: entry.id, title: 'Hello there' }, writer);

    expect(await slugOf(entry.id)).toBe('hello');
  });

  it('keeps following after a rename that did not need disambiguating', async () => {
    const entry = await createEntry(organizationId, { typeId, title: 'One' }, writer);
    await updateEntry(organizationId, { id: entry.id, title: 'Two' }, writer);
    await updateEntry(organizationId, { id: entry.id, title: 'Three' }, writer);

    expect(await slugOf(entry.id)).toBe('three');
  });

  it('disambiguates against a sibling, and still counts as derived', async () => {
    await createEntry(organizationId, { typeId, title: 'Hello world' }, writer);
    const second = await createEntry(organizationId, { typeId, title: 'Draft' }, writer);

    await updateEntry(organizationId, { id: second.id, title: 'Hello world' }, writer);
    expect(await slugOf(second.id)).toBe('hello-world-2');

    // The `-2` was the machine's answer, not a person's, so a further rename
    // still moves it.
    await updateEntry(organizationId, { id: second.id, title: 'Somewhere else' }, writer);
    expect(await slugOf(second.id)).toBe('somewhere-else');
  });

  it('does not bump an entry against its own slug', async () => {
    const entry = await createEntry(organizationId, { typeId, title: 'Hello world' }, writer);

    // Retitling to something that slugifies the same must not produce `-2`.
    await updateEntry(organizationId, { id: entry.id, title: 'Hello  World!' }, writer);

    expect(await slugOf(entry.id)).toBe('hello-world');
  });

  it('leaves the slug alone when only values change', async () => {
    const entry = await createEntry(organizationId, { typeId, title: 'Hello world' }, writer);

    await updateEntry(organizationId, { id: entry.id, values: {} }, writer);

    expect(await slugOf(entry.id)).toBe('hello-world');
  });
});
