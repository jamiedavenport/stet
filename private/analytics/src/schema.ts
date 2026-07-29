import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// One organization's event store, embedded in its AnalyticsStore Durable
// Object. Timestamps are epoch milliseconds (UTC) throughout.
//
// Nothing here can identify a person: the visitor digest is day-scoped and
// computed in the customer's own backend (see @stetcms/analytics), and URLs
// arrive already reduced to a path plus the campaign parameters, so a query
// string carrying a token or an email address is never stored.

export const events = sqliteTable(
  'events',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    timestamp: integer('timestamp').notNull(),
    /** Pathname of the page the event happened on, e.g. `/pricing`. */
    path: text('path'),
    /** Referrer hostname, e.g. `news.ycombinator.com`. */
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    /** Day-scoped visitor digest. Null for events with no browser behind them. */
    visitor: text('visitor'),
    country: text('country'),
    region: text('region'),
    city: text('city'),
    device: text('device'),
    browser: text('browser'),
    os: text('os'),
    /** JSON event props. Shapes vary per event, so they get no columns. */
    props: text('props').notNull().default('{}'),
    /** JSON request context merged by the customer's handler. */
    context: text('context').notNull().default('{}'),
  },
  (table) => [
    index('events_timestamp_idx').on(table.timestamp),
    index('events_name_timestamp_idx').on(table.name, table.timestamp),
  ],
);

export type EventRow = typeof events.$inferSelect;
export type NewEventRow = typeof events.$inferInsert;

/**
 * Hourly counts per dimension, written by the alarm. Raw events are pruned
 * after the retention window; these are kept, so the shape of last year's
 * traffic outlives the rows it was computed from.
 */
export const rollups = sqliteTable(
  'rollups',
  {
    /** Start of the hour, epoch ms. */
    bucket: integer('bucket').notNull(),
    /** Which breakdown this row belongs to, e.g. `path`. */
    dimension: text('dimension').notNull(),
    /** The value counted, e.g. `/pricing`. */
    key: text('key').notNull(),
    count: integer('count').notNull(),
  },
  (table) => [primaryKey({ columns: [table.bucket, table.dimension, table.key] })],
);

/**
 * Single-row watermark: everything before `rolledUpTo` is in `rollups` and
 * may have been pruned from `events`; queries read raws from it onwards.
 * Ingest clamps timestamps to it so no raw row can land behind it.
 */
export const rollupState = sqliteTable('rollup_state', {
  id: integer('id').primaryKey(),
  rolledUpTo: integer('rolled_up_to').notNull(),
});

/**
 * The schema as SQL. The Durable Object applies these to itself on wake and
 * the tests apply them to an in-memory database, so both run the same DDL.
 *
 * Pre-release, changing a table means editing it here and accepting that
 * existing stores keep the old shape until they are reset. Once instances are
 * deployed by other people this needs committed migrations instead, the same
 * switch private/db documents.
 */
export const schemaStatements: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    path TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    visitor TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    props TEXT NOT NULL DEFAULT '{}',
    context TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS events_timestamp_idx ON events (timestamp)`,
  `CREATE INDEX IF NOT EXISTS events_name_timestamp_idx ON events (name, timestamp)`,
  `CREATE TABLE IF NOT EXISTS rollups (
    bucket INTEGER NOT NULL,
    dimension TEXT NOT NULL,
    key TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (bucket, dimension, key)
  )`,
  `CREATE TABLE IF NOT EXISTS rollup_state (
    id INTEGER PRIMARY KEY NOT NULL,
    rolled_up_to INTEGER NOT NULL
  )`,
];
