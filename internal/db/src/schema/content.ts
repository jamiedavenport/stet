import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

import { user } from './auth.ts';
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
    name: text('name').notNull(),
    type: text('type').notNull(),
    /** JSON per-type configuration, e.g. the options of a select. */
    config: text('config').notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    /**
     * Set when the field is deleted. The row stays behind as a tombstone while
     * its key rows keep downstream clients working until completion.
     */
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (table) => [index('content_field_type_idx').on(table.typeId)],
);

// Every public key a field has held. Keeping canonical and deprecated keys in
// one table lets SQLite enforce that an old key cannot be reclaimed while
// downstream code may still read it.
export const contentFieldKey = sqliteTable(
  'content_field_key',
  {
    id: text('id').primaryKey(),
    fieldId: text('field_id')
      .notNull()
      .references(() => contentField.id, { onDelete: 'cascade' }),
    typeId: text('type_id')
      .notNull()
      .references(() => contentType.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    /** `canonical` is the current API key; every other row is an Action. */
    status: text('status').notNull(),
    /** Null for a canonical key; `renamed` or `deleted` once deprecated. */
    kind: text('kind'),
    /** Display name at the moment this key was deprecated. */
    oldName: text('old_name'),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    deprecatedAt: integer('deprecated_at', { mode: 'timestamp' }),
    deprecatedBy: text('deprecated_by').references(() => user.id, { onDelete: 'set null' }),
  },
  (table) => [
    uniqueIndex('content_field_key_unique_idx').on(table.typeId, table.key),
    uniqueIndex('content_field_canonical_idx')
      .on(table.fieldId)
      .where(sql`${table.status} = 'canonical'`),
    index('content_field_key_field_idx').on(table.fieldId),
    index('content_field_key_type_idx').on(table.typeId),
  ],
);

export const contentEntry = sqliteTable(
  'content_entry',
  {
    id: text('id').primaryKey(),
    typeId: text('type_id')
      .notNull()
      .references(() => contentType.id, { onDelete: 'cascade' }),
    // Denormalized so the public API can scope entries without a type join.
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    /** JSON object of stable field id to value; keys absent until first set. */
    values: text('values').notNull(),
    // Derived plain text for the FTS index (see ../search/indexes.ts): entry
    // writes maintain fieldText from `values`, the document mirror in
    // @repo/realtime maintains bodyText from the rich text bodies.
    fieldText: text('field_text').notNull().default(''),
    bodyText: text('body_text').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('content_entry_slug_idx').on(table.typeId, table.slug),
    index('content_entry_org_idx').on(table.organizationId),
  ],
);

// A full snapshot of an entry at a moment: metadata, field values, and every
// rich text body as markdown. Written by @repo/content's revisions module on
// entry writes and on realtime body flushes, coalescing bursts by the same
// actor into one row, so history stays browsable rather than per-keystroke.
export const contentRevision = sqliteTable(
  'content_revision',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => contentEntry.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    /** JSON object of stable field id to value, as `contentEntry.values`. */
    values: text('values').notNull(),
    /** JSON object of rich text field id to markdown; keys absent when never written. */
    bodies: text('bodies').notNull(),
    /** Null when the change has no signed-in author (body flushes, system work). */
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    /** Which surface produced the change, from @repo/audit's Via vocabulary. */
    via: text('via').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('content_revision_entry_idx').on(table.entryId, table.createdAt)],
);
