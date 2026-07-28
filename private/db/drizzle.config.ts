import path from 'node:path';

import { D1Helper } from '@nerdfolio/drizzle-d1-helpers';
import { defineConfig } from 'drizzle-kit';

// One config for both targets (drizzle-kit has no built-in local/remote D1 switch):
// - `pnpm push` (default): the local sqlite file miniflare creates for `vp dev`
// - `pnpm push:remote` (DRIZZLE_REMOTE=1): production D1 via the HTTP API, needs
//   CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_TOKEN (database id comes from wrangler.jsonc)
//
// D1Helper derives the binding, database id, and miniflare sqlite path from the
// wrangler config, but discovers that config from cwd, so run it from apps/web.

// drizzle-kit does not load .env itself; the CLOUDFLARE_* credentials for
// remote pushes live there (see .env.example).
try {
  process.loadEnvFile();
} catch {
  // No .env; rely on the ambient environment (e.g. CI).
}

const webDir = path.resolve('../../apps/web');

function fromWebDir<T>(fn: () => T): T {
  const cwd = process.cwd();
  process.chdir(webDir);
  try {
    return fn();
  } finally {
    process.chdir(cwd);
  }
}

// The FTS5 virtual tables and their shadow tables belong to
// scripts/push-fts.ts, and _cf_KV, d1_migrations, and sqlite_sequence are
// D1/wrangler bookkeeping. None are in the Drizzle schema, so without this
// filter every push and every generate would offer to drop them.
// Not `as const`: drizzle-kit's Config wants a mutable tablesFilter.
const shared = {
  schema: './src/schema',
  dialect: 'sqlite' as const,
  out: './migrations',
  tablesFilter: ['!*_fts*', '!_cf_KV', '!d1_migrations', '!sqlite_sequence'],
};

export default process.env.DRIZZLE_REMOTE
  ? defineConfig({
      ...shared,
      driver: 'd1-http',
      dbCredentials: fromWebDir(
        () =>
          D1Helper.get().withCfCredentials(
            process.env.CLOUDFLARE_ACCOUNT_ID,
            process.env.CLOUDFLARE_D1_TOKEN,
          ).proxyCredentials,
      ),
    })
  : defineConfig({
      ...shared,
      dbCredentials: {
        url: `file:${path.resolve(
          webDir,
          fromWebDir(() => D1Helper.get().sqliteLocalFile),
        )}`,
      },
    });
