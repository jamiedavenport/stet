---
name: demo
description: Reset local data to the demo state described in notes/demo-script.md - a clean organization, the seeded workspace, and a month of analytics traffic. Use when asked to reset, reseed, or prepare the demo, or to get a clean seeded local environment.
---

# Demo reset

Four steps. The dev servers are the user's to run; this only sorts out the data.

1. Stop `vp dev` if it is running, then clear the local Cloudflare state:

   ```bash
   rm -rf apps/web/.wrangler/state
   ```

2. Start the app once (`vp dev apps/web`) and load `http://localhost:3000` so
   miniflare recreates the D1 file, then stop it again.

3. Seed:

   ```bash
   pnpm seed
   ```

4. Start the app again, then backfill traffic so `/app/analytics` is not an
   empty state:

   ```bash
   pnpm --filter @repo/analytics seed
   ```

   Add `-- --days 7` for a quicker rehearsal.

Then `pnpm --filter @examples/tanstack dev` for the example site on 3001.

## Why the state directory goes

`pnpm seed` alone is enough between ordinary runs. A full wipe is what makes
the organization clean, and it is not optional after a rehearsal import:

- The seed only empties the tables it writes, so `import_run`,
  `webhook_endpoint` and `audit_log` rows survive it.
- Entry bodies live in realtime rooms. A room whose Durable Object is still
  awake flushes its own copy back over the seeded one.
- Analytics traffic adds to whatever the store already holds, so a second
  backfill without a wipe doubles the month.

## Afterwards

- Sign in as `seed@example.com` / `seed-password-123`; `admin@example.com` is
  the platform admin. API key `stet_seed_key_for_local_development_only`.
- Check `apps/web/.dev.vars` has an `ANTHROPIC_API_KEY` (the import wizard and
  the assistant both need it) and `WEBHOOKS_BATCH_SECONDS=5` (the 60s default
  is a long silence on a call).
- Warming is the user's job: click through every route the demo visits so
  nothing compiles live, and leave `/app/import` loaded rather than `/app`.

`notes/demo-script.md` is the run sheet.
