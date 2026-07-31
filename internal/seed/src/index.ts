import fs from 'node:fs';
import path from 'node:path';

import { schema } from '@repo/db';
import { seedAdmin, seedApiKey, seedAuthors, seedOrganization, seedUser } from '@repo/db/seed-data';
import { D1Helper } from '@nerdfolio/drizzle-d1-helpers';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { seedAssets, writeAssetBytes } from './assets';
import { people, wipe, writePlatform } from './platform';
import { posts } from './posts';
import { writeDemoWorkspace } from './write';

// Resets the local miniflare D1 database to a known state: wipes the auth and
// content tables, inserts the deterministic accounts the e2e tests rely on,
// and fills the seed organization with the demo workspace beside this file.
// Run it with `pnpm seed` from the repository root, which pushes the schema
// first.

// D1Helper discovers the wrangler config from cwd, so resolve from apps/web
// (same trick as drizzle.config.ts).
const webDir = path.resolve(import.meta.dirname, '../../../apps/web');
const cwd = process.cwd();
process.chdir(webDir);
const sqliteFile = path.resolve(webDir, D1Helper.get().sqliteLocalFile);
process.chdir(cwd);

if (!fs.existsSync(sqliteFile)) {
  throw new Error(
    `Local D1 sqlite file not found at ${sqliteFile}. Run \`pnpm seed\` from the repository root, which pushes the schema first and creates it.`,
  );
}

const sqlite = new Database(sqliteFile);
const db = drizzle(sqlite, { schema });
const now = new Date();

wipe(db);
await writePlatform(db, now);
writeDemoWorkspace(db, seedOrganization.id, now);
sqlite.close();

// Last, and the slow part: wrangler boots miniflare once per file.
writeAssetBytes(webDir, (line) => console.log(line));

console.log(
  `Seeded ${path.basename(sqliteFile)} with ${people.length} accounts (${seedUser.email}, ` +
    `${seedAdmin.email} as platform admin, and ${seedAuthors.length} authors, password ` +
    `"${seedUser.password}"), the ${seedOrganization.name} workspace with ${posts.length} posts ` +
    `and ${seedAssets.length} files, and API key ${seedApiKey.key}`,
);
