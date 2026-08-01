import { eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { completeFieldAction, listFieldActions } from './deprecations';
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
    expect(parseValues(row?.values ?? '{}')[field.id]).toBe('A subtitle');
  });
});

describe('listFieldActions', () => {
  it('names the deleted field and who deleted it', async () => {
    const { field } = await seedDeprecation();

    const [deprecation] = await listFieldActions(organizationId);
    expect(deprecation.key).toBe(field.key);
    expect(deprecation.typeSlug).toBe('posts');
    expect(deprecation.createdBy).toBe('Ada');
  });

  it('leaves live fields out', async () => {
    const type = await createContentType(
      organizationId,
      { name: 'Posts', kind: 'collection' },
      editor,
    );
    await createField(organizationId, { typeId: type.id, name: 'Subtitle', type: 'text' }, editor);

    expect(await listFieldActions(organizationId)).toHaveLength(0);
  });
});

describe('completeFieldAction', () => {
  it('erases the tombstone, so the key leaves the generated client', async () => {
    const { field } = await seedDeprecation();
    const [action] = await listFieldActions(organizationId);
    await completeFieldAction(organizationId, action.id, editor);

    const row = await db.query.contentField.findFirst({
      where: eq(schema.contentField.id, field.id),
    });
    expect(row).toBeUndefined();
  });

  it('erases the values entries were still carrying', async () => {
    const { field, entry } = await seedDeprecation();
    const [action] = await listFieldActions(organizationId);
    await completeFieldAction(organizationId, action.id, editor);

    const row = await db.query.contentEntry.findFirst({
      where: eq(schema.contentEntry.id, entry.id),
    });
    expect(parseValues(row?.values ?? '{}')).not.toHaveProperty(field.id);
  });

  it('erases the copies the history holds', async () => {
    const { field, entry } = await seedDeprecation();
    const [action] = await listFieldActions(organizationId);
    await completeFieldAction(organizationId, action.id, editor);

    const revisions = await db.query.contentRevision.findMany({
      where: eq(schema.contentRevision.entryId, entry.id),
    });
    // A revision is a whole snapshot, so a value left here is one restore away
    // from coming back under a key the model no longer has.
    expect(revisions.length).toBeGreaterThan(0);
    for (const revision of revisions) {
      expect(parseValues(revision.values)).not.toHaveProperty(field.id);
    }
  });

  it('hands the key back, now that nothing is stored under it', async () => {
    const { type } = await seedDeprecation();
    const [action] = await listFieldActions(organizationId);
    await completeFieldAction(organizationId, action.id, editor);

    const replacement = await createField(
      organizationId,
      { typeId: type.id, name: 'Subtitle', type: 'text' },
      editor,
    );
    expect(replacement.key).toBe('subtitle');
  });

  it('is a no-op for an unknown or already completed action', async () => {
    const type = await createContentType(
      organizationId,
      { name: 'Posts', kind: 'collection' },
      editor,
    );
    await createField(organizationId, { typeId: type.id, name: 'Subtitle', type: 'text' }, editor);
    await expect(completeFieldAction(organizationId, 'missing', editor)).resolves.toBeUndefined();
  });

  it("cannot complete another organization's action", async () => {
    const foreignOrganizationId = 'org-2';
    await db.insert(schema.organization).values({
      id: foreignOrganizationId,
      name: 'Org Two',
      slug: 'org-two',
      createdAt: new Date(),
    });
    const type = await createContentType(
      foreignOrganizationId,
      { name: 'Pages', kind: 'collection' },
      editor,
    );
    const field = await createField(
      foreignOrganizationId,
      { typeId: type.id, name: 'Summary', type: 'text' },
      editor,
    );
    await deleteField(foreignOrganizationId, field.id, editor);
    const [action] = await listFieldActions(foreignOrganizationId);

    await expect(completeFieldAction(organizationId, action.id, editor)).rejects.toThrow(
      'Content type not found',
    );
    expect(
      await db.query.contentField.findFirst({ where: eq(schema.contentField.id, field.id) }),
    ).toBeDefined();
  });
});
