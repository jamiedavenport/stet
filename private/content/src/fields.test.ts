import { eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { createField, deleteField } from './fields';
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
    // The row is what /api/v1/model deprecates the key from; dropping it is
    // what would break a customer's build.
    expect(row?.key).toBe('subtitle');
    expect(row?.deletedAt).toBeInstanceOf(Date);
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
