import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { organization } from './organizations.ts';

// One row per site import: the reviewed plan frozen at start, and the
// progress and per-page outcomes the workflow writes as it goes. The row is
// both the wizard's progress feed and the report it ends on.

export const importRun = sqliteTable(
  'import_run',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    /** The origin the content came from, e.g. https://example.com. */
    origin: text('origin').notNull(),
    status: text('status').notNull(),
    /** JSON ImportPlan (see @repo/import/plan), frozen when the run starts. */
    plan: text('plan').notNull(),
    /** JSON ImportProgress counters, updated after every batch. */
    progress: text('progress').notNull(),
    /** JSON array of ImportItem outcomes, appended as batches finish. */
    report: text('report').notNull().default('[]'),
    /** Why status is `failed`; null otherwise. */
    error: text('error'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('import_run_org_idx').on(table.organizationId)],
);
