# @repo/seed

The local seed: `pnpm seed` from the repository root pushes the schema (see
[internal/db](../db)) and then runs `src/index.ts`, which resets the miniflare
D1 database to a known state and fills it with a workspace that reads like one
in use.

Miniflare creates that sqlite file lazily, on the first query a request happens
to make, so on a fresh clone there is nothing to push into. `pnpm push` creates
it up front (`scripts/ensure-local-db.ts`), which is what makes the seed the
only setup step.

Its own package rather than a script in `@repo/db`, because writing bodies
means importing `@repo/content` and `@repo/realtime`, which both depend on
`@repo/db`. Nothing depends on this package, so the dependency only runs one
way.

## What it writes

- `src/index.ts`: the accounts, organizations, subscription, invitation, files
  and API key. The ids and names come from `@repo/db/seed-data`, which is what
  the e2e tests assert against; everything else lives here.
- `src/model.ts`, `src/posts.ts`, `src/bodies/`: the demo workspace. A Posts
  collection of ten posts with authors, covers, topics, tags and written
  markdown bodies, and a Landing map. Dates are relative to the run, so a
  workspace seeded today reads as one that has been used for months.
- `src/write.ts`: the D1 writes for all of that, plus two revisions per entry
  so version history has something to restore.
- `src/assets.ts`, `src/png.ts`, `src/pdf.ts`: the files. Cover art and the one
  attachment are generated rather than committed as binaries, and their bytes
  are put into the local R2 bucket with `wrangler r2 object put`.

## Two things worth knowing

**Bodies are documents, not columns.** A rich text body lives in the entry's
realtime room (see [internal/realtime](../realtime)), so each is built as a Yjs
document and stored as that room's state. A room whose Durable Object is still
awake keeps its own copy and will flush it back over the seed, so delete
`apps/web/.wrangler/state` before reseeding if bodies look stale.

**Uploading the files is the slow part.** `wrangler r2 object put` boots
miniflare once per file, and the puts have to run one at a time: concurrent
ones race each other's writes to the bucket index and silently drop objects.
