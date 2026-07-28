import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { user } from './auth.ts';
import { organization } from './organizations.ts';

// One row per recipient, written eagerly by the deliver-notification job
// (see @repo/notifications). `payload` is the raw registry payload for deep
// links and richer clients; `title`/`href` are the rendered snapshot the feed
// reads, so historical rows keep rendering after a notification type changes
// or disappears from the registry.
export const notification = sqliteTable(
  'notification',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    title: text('title').notNull(),
    href: text('href'),
    readAt: integer('read_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    // Feed reads and unread counts are always scoped to (user, org).
    index('notification_feed_idx').on(table.userId, table.organizationId, table.createdAt),
    index('notification_unread_idx').on(table.userId, table.organizationId, table.readAt),
  ],
);

// Per-(type, channel) exceptions to the registry's default channels. Absent
// row = the notification type's default; rows only record opt-outs and
// opt-ins, so new notification types need no backfill.
export const notificationPreference = sqliteTable(
  'notification_preference',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    channel: text('channel').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.type, table.channel] })],
);

// Per-user delivery window for external channels. Quiet hours are local
// hours (0-23) in `timezone` and may wrap midnight; null start/end disables
// them. In-app rows are never delayed, only email flushes are.
export const notificationSettings = sqliteTable('notification_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  quietHoursStart: integer('quiet_hours_start'),
  quietHoursEnd: integer('quiet_hours_end'),
  timezone: text('timezone'),
  // Master switch for the email channel; null means enabled so existing and
  // new users need no backfill. One-click unsubscribe flips it off, the
  // settings page flips it back.
  emailEnabled: integer('email_enabled', { mode: 'boolean' }),
});
