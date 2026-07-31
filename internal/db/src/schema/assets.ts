import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { user } from './auth.ts';
import { organization } from './organizations.ts';

// One row per object in the R2 bucket. The key is stored rather than derived
// so the sweeps that delete objects need nothing but this table.
export const asset = sqliteTable(
  'asset',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    /** Null for assets owned by a person rather than a tenant, i.e. avatars. */
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'cascade',
    }),
    // Nulled rather than cascaded: an organization's files must not vanish
    // with the member who uploaded them. Personal assets have no owner to
    // fall back on, so the purge job deletes those rows outright.
    uploadedBy: text('uploaded_by').references(() => user.id, { onDelete: 'set null' }),
    /** Which upload flow produced this, from the kind registry in apps/web. */
    kind: text('kind').notNull(),
    /** The client's filename, for download headers and file listings. */
    name: text('name').notNull(),
    size: integer('size').notNull(),
    contentType: text('content_type').notNull(),
    /** `pending` until R2 has the bytes. Both states count against quota; only `uploaded` rows serve. */
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('asset_org_idx').on(table.organizationId),
    index('asset_status_idx').on(table.status, table.createdAt),
  ],
);
