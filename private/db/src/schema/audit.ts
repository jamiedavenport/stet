import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { user } from './auth.ts';
import { organization } from './organizations.ts';

// One row per discrete change to an organization's content, model, or assets,
// written by @repo/audit. Continuous edits (cell saves, body typing) are
// coalesced there; this table records actions, revisions record states.
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    /** Null when no signed-in user made the change (system work). */
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    /** Which surface the change came through, from @repo/audit's Via vocabulary. */
    via: text('via').notNull(),
    /** `subject.verb`, from @repo/audit's action vocabulary, e.g. `entry.create`. */
    action: text('action').notNull(),
    subjectType: text('subject_type').notNull(),
    subjectId: text('subject_id').notNull(),
    /** Display name of the subject at the time, so rows outlive deletions. */
    label: text('label').notNull(),
    /** JSON action detail, e.g. `{ "from": "Old name", "to": "New name" }`. */
    details: text('details').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('audit_log_org_idx').on(table.organizationId, table.createdAt),
    // For coalescing: the latest row for one subject by one actor.
    index('audit_log_subject_idx').on(table.organizationId, table.subjectId, table.createdAt),
  ],
);
