import { eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { listDeprecatedFields, purgeField } from './deprecations';
import { createEntry } from './entries';
import { createField, deleteField } from './fields';
import { createContentType } from './model';
import { parseValues } from './schema';

const organizationId = 'org-1';
const editor = { userId: 'user-1', via: 'app' } as const;

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
  await db.insert(schema.user).values({
    id: editor.userId,
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

/** A collection with one filled-in text field, then deleted. */
async function seedDeprecation() {
  const type = await createContentType(
    organizationId,
    { name: 'Posts', kind: 'collection' },
    editor,
  );
  const field = await createField(
    organizationId,
    { typeId: type.id, name: 'Subtitle', type: 'text' },
    editor,
  );
  const entry = await createEntry(
    organizationId,
    { typeId: type.id, title: 'Hello world', values: { [field.key]: 'A subtitle' } },
    editor,
  );
  await deleteField(organizationId, field.id, editor);
  return { type, field, entry };
}

describe('deleteField', () => {
  it('leaves the value behind, so the API can go on serving it', async () => {
    const { field, entry } = await seedDeprecation();

    const row = await db.query.contentEntry.findFirst({
      where: eq(schema.contentEntry.id, entry.id),
    });
    // The promise a deletion keeps: the key is retired, not emptied, so a page
    // reading it renders exactly as it did before someone deleted the column.
    expect(parseValues(row?.values ?? '{}')[field.key]).toBe('A subtitle');
  });
});

describe('listDeprecatedFields', () => {
  it('names the deleted field, who deleted it, and what still depends on it', async () => {
    const { field } = await seedDeprecation();

    const [deprecation] = await listDeprecatedFields(organizationId);
    expect(deprecation.key).toBe(field.key);
    expect(deprecation.typeSlug).toBe('posts');
    expect(deprecation.deletedBy).toBe('Ada');
    expect(deprecation.entriesWithValue).toBe(1);
  });

  it('leaves live fields out', async () => {
    const type = await createContentType(
      organizationId,
      { name: 'Posts', kind: 'collection' },
      editor,
    );
    await createField(organizationId, { typeId: type.id, name: 'Subtitle', type: 'text' }, editor);

    expect(await listDeprecatedFields(organizationId)).toHaveLength(0);
  });
});

describe('purgeField', () => {
  it('erases the tombstone, so the key leaves the generated client', async () => {
    const { field } = await seedDeprecation();
    await purgeField(organizationId, field.id, editor);

    const row = await db.query.contentField.findFirst({
      where: eq(schema.contentField.id, field.id),
    });
    expect(row).toBeUndefined();
  });

  it('erases the values entries were still carrying', async () => {
    const { field, entry } = await seedDeprecation();
    await purgeField(organizationId, field.id, editor);

    const row = await db.query.contentEntry.findFirst({
      where: eq(schema.contentEntry.id, entry.id),
    });
    expect(parseValues(row?.values ?? '{}')).not.toHaveProperty(field.key);
  });

  it('erases the copies the history holds', async () => {
    const { field, entry } = await seedDeprecation();
    await purgeField(organizationId, field.id, editor);

    const revisions = await db.query.contentRevision.findMany({
      where: eq(schema.contentRevision.entryId, entry.id),
    });
    // A revision is a whole snapshot, so a value left here is one restore away
    // from coming back under a key the model no longer has.
    expect(revisions.length).toBeGreaterThan(0);
    for (const revision of revisions) {
      expect(parseValues(revision.values)).not.toHaveProperty(field.key);
    }
  });

  it('hands the key back, now that nothing is stored under it', async () => {
    const { type, field } = await seedDeprecation();
    await purgeField(organizationId, field.id, editor);

    const replacement = await createField(
      organizationId,
      { typeId: type.id, name: 'Subtitle', type: 'text' },
      editor,
    );
    expect(replacement.key).toBe('subtitle');
  });

  it('refuses a field that is still in the model', async () => {
    const type = await createContentType(
      organizationId,
      { name: 'Posts', kind: 'collection' },
      editor,
    );
    const field = await createField(
      organizationId,
      { typeId: type.id, name: 'Subtitle', type: 'text' },
      editor,
    );

    await expect(purgeField(organizationId, field.id, editor)).rejects.toThrow(
      'Deleted field not found',
    );
  });
});
