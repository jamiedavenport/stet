import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { organization } from './organizations.ts';

// The organization's tracking plan, as its developers declared it in code and
// published with @stetcms/vite or `stet sync`. Events themselves live in the
// organization's AnalyticsStore Durable Object (see @repo/analytics); this is
// only the list of what can be recorded, so the dashboard can offer an event
// before anyone has fired it.

export const analyticsEvent = sqliteTable(
  'analytics_event',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    /** Dot-joined name as tracked, e.g. `checkout.completed`. */
    name: text('name').notNull(),
    /** JSON array of the prop keys the event declares. */
    props: text('props').notNull().default('[]'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [uniqueIndex('analytics_event_name_idx').on(table.organizationId, table.name)],
);
