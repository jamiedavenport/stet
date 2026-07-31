import { customType, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { organization } from './organizations.ts';

// Drizzle's own blob column types as a Node Buffer, which neither yjs nor the
// Worker-targeted packages that read this speak. The drivers hand blobs back
// differently (D1 an array, better-sqlite3 a Buffer); both construct.
const bytes = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => 'blob',
  fromDriver: (value) => new Uint8Array(value),
});

// One row per collaborative room (see @repo/realtime), keyed by the two
// halves of the room name. `state` is the Yjs document encoded with
// encodeStateAsUpdate, so a row restores the whole document rather than a
// rendering of it: the Durable Object reloads from here when its own storage
// is gone, and readers outside a session rehydrate it into a Y.Doc.
export const document = sqliteTable(
  'document',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    /** The page the room belongs to, e.g. `/app/notes`. */
    page: text('page').notNull(),
    state: bytes('state').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.page] })],
);
