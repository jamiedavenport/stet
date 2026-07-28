import type { D1Database } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';

import * as schema from './schema/index.ts';

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;

let override: Database | null = null;
let ambient: Database | null = null;

/** Points every caller of database() at a specific database. Only tests need
 * this: inside the worker the binding resolves itself. */
export function setDatabase(db: Database | null): void {
  override = db;
}

/**
 * The worker's database, resolved from the ambient D1 binding and reused for
 * the lifetime of the isolate. Prefer this over threading a Database through
 * call signatures or building one per request.
 */
// cloudflare:workers only exists inside the worker runtime, so it is imported
// lazily: node scripts and unit tests call setDatabase() first and never
// reach it.
export async function database(): Promise<Database> {
  if (override !== null) {
    return override;
  }
  if (ambient === null) {
    const { env } = await import('cloudflare:workers');
    ambient = createDb((env as unknown as { DB: D1Database }).DB);
  }
  return ambient;
}

export { schema };

export * from 'drizzle-orm';
