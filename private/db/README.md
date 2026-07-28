# @repo/db

Drizzle schema and typed data access for Cloudflare D1 (binding `DB` in `apps/web/wrangler.jsonc`).

- `src/index.ts`: `database()`, the ambient client every caller shares, plus `setDatabase()` for tests and `createDb(d1)` for the one synchronous caller (the Better Auth adapter).
- `src/schema/`: single source of truth for all tables, one file per domain (assets, auth, organizations, billing, documents, notifications, webhooks), re-exported flat from `src/schema/index.ts`.
- `src/search/`: `@repo/db/search`, the FTS5 full-text primitive. `fts.ts` holds it, `indexes.ts` declares this app's indexes.
- `src/seed-data.ts` and `pnpm seed`: deterministic local seed, used by the e2e tests. It creates `seed@example.com` (a regular member of Seed Org) and `admin@example.com` (platform admin, for `/app/admin`), both with the password in `seed-data.ts`.

## Schema changes

Edit the domain file in `src/schema/` (or add a new one and list it in `src/schema/index.ts`), then push:

```bash
pnpm push          # local sqlite created by `vp dev`
pnpm push:remote   # production D1 (needs CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_TOKEN)
```

Remote credentials go in `.env` (gitignored); copy `.env.example` and fill in an API token with Account > D1 > Edit permission.

## Full-text search

D1 supports FTS5, but Drizzle Kit cannot manage virtual tables, so an index is
declared in `src/search/indexes.ts` off the schema objects and applied by
`scripts/push-fts.ts` (`pnpm push:fts`), which both `pnpm push` targets run
straight after `drizzle-kit push`:

```ts
export const assetIndex = ftsIndex({
  table: asset,
  id: asset.id,
  columns: [asset.name],
});
```

That creates `asset_fts` plus the three triggers that keep it in step with
`asset`, so nothing in application code has to remember to reindex. The whole
index is dropped and rebuilt on every push: `CREATE ... IF NOT EXISTS` would
leave an index built from an older set of columns in place, returning stale
results. `drizzle.config.ts` excludes `*_fts*` via `tablesFilter` so pushes
leave these tables alone.

Searching is two queries, and the second one is yours:

```ts
const ids = await ftsSearch(assetIndex, query, 10);
const rows = await db
  .select()
  .from(schema.asset)
  .where(and(inArray(schema.asset.id, ids), eq(schema.asset.organizationId, organizationId)));
rows.sort(byRank(ids));
```

`ftsSearch` only returns keys, so rows stay typed by the schema and tenant
scoping is an ordinary predicate. That scoping is not optional: an index spans
its whole table, so `user_fts` matches people in every organization.

## Switching to migrations

`push` diffs the schema straight onto one database, which is right while you are the only deployer and the schema is moving fast. But it has no history, so it cannot safely upgrade a database it has never seen: run unattended it turns a rename into a drop, and it has nowhere to carry a data backfill. Once other people deploy your fork, switch to committed migrations at your first release.

The plumbing is already wired and dormant: `pnpm generate` writes SQL files to `migrations/`, `apps/web/wrangler.jsonc` points its `migrations_dir` there, and both `vp run web#migrate` (local) and the deploy job's `web#migrate:remote` apply whatever the folder holds with `wrangler d1 migrations apply`, recording each file in a `d1_migrations` table inside the database. While the folder is empty, all of that is a no-op.

To switch:

1. Generate a baseline from the current schema: `pnpm generate --name init`. Commit `migrations/` including `meta/` (drizzle-kit's journal; wrangler ignores it).
2. A database built with `push` already matches the baseline, so record it as applied instead of running it (which would fail on the existing tables):

   ```bash
   cd apps/web && pnpm exec wrangler d1 execute onyx-db --remote --command \
     "CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP NOT NULL DEFAULT current_timestamp); \
      INSERT INTO d1_migrations (name) VALUES ('0000_init.sql');"
   ```

   For the local dev database it is simpler to delete `apps/web/.wrangler/state` and rebuild with `vp run web#migrate` plus `pnpm seed`.

3. Retire `push` and `push:remote` (they bypass the ledger) and swap the `seed` script's `push --force` for a migration apply.
4. Move the full-text indexes into the ledger too, since retiring `push` retires the step that applied them. `drizzle-kit generate --custom --name fts` writes an empty migration; paste in what `pnpm push:fts` would have run (`ftsStatements` returns exactly those statements, and `node -e` over `@repo/db/search` will print them). Drop `push:fts` once they are committed. Until then, keep running it after a migration apply.
5. From then on a schema change is: edit `src/schema/`, `pnpm generate`, review the SQL, commit it with the code. Apply locally with `vp run web#migrate`; deploys apply automatically, and self-hosters upgrade with `web#migrate:remote`, which skips anything already recorded.

Two things `generate` handles that `push` never could: it prompts rename-vs-create on your machine (verify the emitted `ALTER TABLE`), and a backfill is plain SQL appended to the generated file. If iteration between releases piles up small migrations, squash them into one per release before tagging; everything before the switch is already invisible, because the baseline comes from the finished schema.
