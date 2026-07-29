import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { organization } from './organizations.ts';

// The content model marketing builds in the UI: types own fields, entries
// hold values keyed by field key. Rich text is deliberately absent from
// `values`: each entry's bodies live in the entry's collaborative document
// (see @repo/realtime), and the API serializes them to markdown on read.

export const contentType = sqliteTable(
  'content_type',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    /** 'collection' holds many entries; 'map' holds exactly one. */
    kind: text('kind').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [uniqueIndex('content_type_slug_idx').on(table.organizationId, table.slug)],
);

export const contentField = sqliteTable(
  'content_field',
  {
    id: text('id').primaryKey(),
    typeId: text('type_id')
      .notNull()
      .references(() => contentType.id, { onDelete: 'cascade' }),
    /** The key entry values and the generated client are addressed by. */
    key: text('key').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    /** JSON per-type configuration, e.g. the options of a select. */
    config: text('config').notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('content_field_key_idx').on(table.typeId, table.key),
    index('content_field_type_idx').on(table.typeId),
  ],
);

export const contentEntry = sqliteTable(
  'content_entry',
  {
    id: text('id').primaryKey(),
    typeId: text('type_id')
      .notNull()
      .references(() => contentType.id, { onDelete: 'cascade' }),
    // Denormalized so the public API can scope by key without a join.
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    /** JSON object of field key to value; keys absent until first set. */
    values: text('values').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('content_entry_slug_idx').on(table.typeId, table.slug),
    index('content_entry_org_idx').on(table.organizationId),
  ],
);
