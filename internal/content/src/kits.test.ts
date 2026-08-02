import { eq, schema, setDatabase } from '@repo/db';
import type { Database as StetDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { createField } from './fields';
import { modelKitSchema } from './kit-schema';
import { applyModelKit, exportModelKit } from './kits';
import { createContentType, readContentModel } from './model';

const sourceId = 'org-source';
const targetId = 'org-target';
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
  await db.insert(schema.organization).values([
    { id: sourceId, name: 'Agency base', slug: 'agency-base', createdAt: new Date() },
    { id: targetId, name: 'Client', slug: 'client', createdAt: new Date() },
  ]);
  await db.insert(schema.user).values({
    id: editor.userId,
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

async function seedModel() {
  const authors = await createContentType(
    sourceId,
    { name: 'People', slug: 'authors', kind: 'collection' },
    editor,
  );
  const posts = await createContentType(
    sourceId,
    { name: 'Writing', slug: 'posts', kind: 'collection' },
    editor,
  );
  await createContentType(sourceId, { name: 'Home page', slug: 'home', kind: 'map' }, editor);
  await createField(
    sourceId,
    { typeId: authors.id, name: 'Full name', key: 'display_name', type: 'text' },
    editor,
  );
  await createField(
    sourceId,
    {
      typeId: posts.id,
      name: 'Status',
      key: 'publication_status',
      type: 'select',
      config: {
        options: [
          { id: 'draft-option', name: 'Draft', color: 'gray' },
          { id: 'live-option', name: 'Live', color: 'green' },
        ],
      },
    },
    editor,
  );
  await createField(
    sourceId,
    {
      typeId: posts.id,
      name: 'Author',
      key: 'author',
      type: 'reference',
      config: { typeId: authors.id },
    },
    editor,
  );
}

describe('model kits', () => {
  it('exports only the canonical model in a portable format', async () => {
    await seedModel();

    const kit = await exportModelKit(sourceId);

    expect(kit).toMatchObject({
      format: 'stet-model-kit',
      version: 1,
      name: 'Agency base model',
    });
    expect(Object.hasOwn(kit, 'entries')).toBe(false);
    expect(kit.types.map(({ slug }) => slug).sort()).toEqual(['authors', 'home', 'posts']);
    expect(kit.types.find(({ slug }) => slug === 'posts')?.fields).toEqual([
      {
        name: 'Status',
        key: 'publication_status',
        type: 'select',
        options: [
          { name: 'Draft', color: 'gray' },
          { name: 'Live', color: 'green' },
        ],
      },
      {
        name: 'Author',
        key: 'author',
        type: 'reference',
        collection: 'authors',
      },
    ]);
  });

  it('applies types first, then preserves exact keys and remaps configuration ids', async () => {
    await seedModel();
    const kit = await exportModelKit(sourceId);

    await applyModelKit(targetId, kit, editor);

    const model = await readContentModel(targetId);
    expect(
      model.types
        .map(({ name, slug, kind }) => ({ name, slug, kind }))
        .sort((left, right) => left.slug.localeCompare(right.slug)),
    ).toEqual([
      { name: 'People', slug: 'authors', kind: 'collection' },
      { name: 'Home page', slug: 'home', kind: 'map' },
      { name: 'Writing', slug: 'posts', kind: 'collection' },
    ]);
    const authors = model.types.find((type) => type.slug === 'authors');
    const posts = model.types.find((type) => type.slug === 'posts');
    expect(authors?.fields[0]?.key).toBe('display_name');
    expect(posts?.fields.map((field) => field.key)).toEqual(['publication_status', 'author']);
    expect(posts?.fields[0]?.config.options?.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: expect.not.stringMatching(/^(draft|live)-option$/), name: 'Draft' },
      { id: expect.not.stringMatching(/^(draft|live)-option$/), name: 'Live' },
    ]);
    expect(posts?.fields[1]?.config.typeId).toBe(authors?.id);
    const entries = await db.query.contentEntry.findMany({
      where: eq(schema.contentEntry.organizationId, targetId),
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      typeId: model.types.find((type) => type.slug === 'home')?.id,
      slug: 'default',
      values: '{}',
    });
  });

  it('refuses to apply a kit to a non-empty organization', async () => {
    await seedModel();
    const kit = await exportModelKit(sourceId);
    await createContentType(targetId, { name: 'Existing', kind: 'collection' }, editor);

    await expect(applyModelKit(targetId, kit, editor)).rejects.toThrow(
      'only be applied to an empty organization',
    );
  });

  it('rejects content in a kit file', () => {
    const parsed = modelKitSchema.safeParse({
      format: 'stet-model-kit',
      version: 1,
      name: 'Unsafe kit',
      entries: [{ title: 'Do not copy me' }],
      types: [],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain('Unrecognized key');
    }
  });

  it('rejects broken references in a kit file', () => {
    const parsed = modelKitSchema.safeParse({
      format: 'stet-model-kit',
      version: 1,
      name: 'Broken kit',
      types: [
        {
          name: 'Posts',
          slug: 'posts',
          kind: 'collection',
          fields: [{ name: 'Author', key: 'author', type: 'reference', collection: 'authors' }],
        },
      ],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe('Collection not found: authors');
    }
  });
});
