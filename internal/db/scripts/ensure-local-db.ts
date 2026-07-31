import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { D1Helper } from '@nerdfolio/drizzle-d1-helpers';

// Miniflare creates the local D1 file lazily, on the first query a request
// happens to make, so on a fresh clone `drizzle-kit push` has nothing to open
// and no marketing route touches the database to produce one. Making wrangler
// run a trivial query is the cheapest way to get the file, and it is also the
// only one that stays correct: the filename is a hash of the database id that
// only miniflare knows how to derive.

if (process.env.DRIZZLE_REMOTE) {
  process.exit(0);
}

const webDir = path.resolve(import.meta.dirname, '../../../apps/web');

// D1Helper reads the wrangler config from cwd, so it only resolves from apps/web.
const cwd = process.cwd();
process.chdir(webDir);
const helper = D1Helper.get();
const { binding, wranglerStateDir } = helper;
process.chdir(cwd);

const d1Dir = path.resolve(webDir, wranglerStateDir, 'd1', 'miniflare-D1DatabaseObject');

// metadata.sqlite is miniflare's own bookkeeping and exists without a database.
const hasDatabase =
  fs.existsSync(d1Dir) &&
  fs.readdirSync(d1Dir).some((name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite');

if (!hasDatabase) {
  const args = ['exec', 'wrangler', 'd1', 'execute', binding, '--local', '--command', 'select 1'];
  execFileSync('pnpm', args, { cwd: webDir, stdio: 'ignore' });
  console.log('[d1] created the local database');
}
