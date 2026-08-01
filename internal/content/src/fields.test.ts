import { eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { completeFieldAction, listFieldActions } from './deprecations';
import { createEntry } from './entries';
import { createField, deleteField, updateField } from './fields';
import { createContentType, readContentModel } from './model';

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

/** A collection with one text field. */
async function seedField() {
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
  return { type, field };
}

describe('deleteField', () => {
  it('tombstones the field rather than removing it', async () => {
    const { field } = await seedField();
    await deleteField(organizationId, field.id, editor);

    const row = await db.query.contentField.findFirst({
      where: eq(schema.contentField.id, field.id),
    });
    expect(row?.deletedAt).toBeInstanceOf(Date);
    const key = await db.query.contentFieldKey.findFirst({
      where: eq(schema.contentFieldKey.fieldId, field.id),
    });
    expect(key?.key).toBe('subtitle');
    expect(key?.kind).toBe('deleted');
    expect(key?.deprecatedBy).toBe(editor.userId);
  });

  it('stops listing the field in the model editors work from', async () => {
    const { field } = await seedField();
    await deleteField(organizationId, field.id, editor);

    const model = await readContentModel(organizationId);
    expect(model.types[0].fields).toHaveLength(0);
  });

  it('refuses a second delete', async () => {
    const { field } = await seedField();
    await deleteField(organizationId, field.id, editor);

    await expect(deleteField(organizationId, field.id, editor)).rejects.toThrow('Field not found');
  });

  it('keeps the key reserved, so a new field cannot inherit its values', async () => {
    const { type, field } = await seedField();
    await deleteField(organizationId, field.id, editor);

    const replacement = await createField(
      organizationId,
      { typeId: type.id, name: 'Subtitle', type: 'text' },
      editor,
    );
    expect(replacement.key).not.toBe('subtitle');
  });
});

describe('field renames', () => {
  it('keeps an x to y to z chain as live aliases over stable storage', async () => {
    const { type, field } = await seedField();
    await createEntry(
      organizationId,
      { typeId: type.id, title: 'Hello', values: { subtitle: 'Value' } },
      editor,
    );

    await updateField(organizationId, { id: field.id, name: 'Summary' }, editor);
    await updateField(organizationId, { id: field.id, name: 'Excerpt' }, editor);

    const actions = await listFieldActions(organizationId);
    expect(actions.map((action) => action.key).sort()).toEqual(['subtitle', 'summary']);
    expect(actions.every((action) => action.canonicalKey === 'excerpt')).toBe(true);
    const entry = await db.query.contentEntry.findFirst();
    expect(JSON.parse(entry?.values ?? '{}')).toEqual({ [field.id]: 'Value' });

    const summary = actions.find((action) => action.key === 'summary');
    await completeFieldAction(organizationId, summary?.id ?? '', editor);
    const remaining = await listFieldActions(organizationId);
    expect(remaining.map((action) => action.key)).toEqual(['subtitle']);
  });
});
