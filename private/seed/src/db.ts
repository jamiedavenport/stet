import type { schema } from '@repo/db';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

/**
 * The seed writes to miniflare's sqlite file directly rather than through
 * `@repo/db`'s `database()`, which resolves a D1 binding that only exists
 * inside the worker.
 */
export type Db = BetterSQLite3Database<typeof schema>;
