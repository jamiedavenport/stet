import path from 'node:path';

import { D1Helper } from '@nerdfolio/drizzle-d1-helpers';
import Sqlite from 'better-sqlite3';

import { ftsIndexes, ftsStatements } from '../src/search/index.ts';

// The FTS5 tables Drizzle Kit cannot manage, applied straight after
// `drizzle-kit push` so one `pnpm push` leaves the database whole. Target
// selection mirrors drizzle.config.ts: DRIZZLE_REMOTE picks production D1.

try {
  process.loadEnvFile();
} catch {
  // No .env; rely on the ambient environment (e.g. CI).
}

const webDir = path.resolve(import.meta.dirname, '../../../apps/web');

// D1Helper reads the wrangler config from cwd, so it only resolves from apps/web.
function fromWebDir<T>(fn: () => T): T {
  const cwd = process.cwd();
  process.chdir(webDir);
  try {
    return fn();
  } finally {
    process.chdir(cwd);
  }
}

type Target = {
  label: string;
  run(statement: string): Promise<void>;
};

function localTarget(): Target {
  const file = path.resolve(
    webDir,
    fromWebDir(() => D1Helper.get().sqliteLocalFile),
  );
  const sqlite = new Sqlite(file);
  return {
    label: `local (${path.basename(file)})`,
    run: async (statement) => {
      sqlite.exec(statement);
    },
  };
}

function remoteTarget(): Target {
  const { accountId, databaseId, token } = fromWebDir(
    () =>
      D1Helper.get().withCfCredentials(
        process.env.CLOUDFLARE_ACCOUNT_ID,
        process.env.CLOUDFLARE_D1_TOKEN,
      ).proxyCredentials,
  );
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  return {
    label: `remote (${databaseId})`,
    run: async (statement) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ sql: statement }),
      });
      const body = (await response.json()) as { success: boolean; errors?: { message: string }[] };
      if (!body.success) {
        const reason = body.errors?.map((error) => error.message).join(', ') ?? response.statusText;
        throw new Error(`${statement.slice(0, 60)}...: ${reason}`);
      }
    },
  };
}

const target = process.env.DRIZZLE_REMOTE ? remoteTarget() : localTarget();

for (const index of ftsIndexes) {
  for (const statement of ftsStatements(index)) {
    await target.run(statement);
  }
  console.log(`[fts] ${index.name} <- ${index.source}(${index.columns.join(', ')})`);
}

console.log(`[fts] ${ftsIndexes.length} indexes pushed to ${target.label}`);
