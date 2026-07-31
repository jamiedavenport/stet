# @repo/crons

Scheduled jobs on Cloudflare Cron Triggers, hosted in the `stet-web` Worker.

- Define handlers in `src/crons/` and register them per cron expression in `src/registry.ts`. The registry is the single source of truth: the wrangler `triggers` config is generated from it at build time, so adding a cron never touches `wrangler.jsonc`.
- A handler is given the run's logger and adds to the event the run already emits (`cron.removed` for the sweeps), rather than printing a line of its own.
- Ships a daily sweep of expired auth rows: sessions, verification tokens, device codes, and pending invitations.
- Ships a nightly sweep of entry revisions past the newest few an entry keeps (see [internal/content](../content)), which is what bounds a table that otherwise grows with every edit.
- Ships an hourly sweep of abandoned uploads: an asset row is written before its bytes arrive, so a cancelled upload leaves one behind holding the organization's storage quota. The rows are deleted here and their objects handed to the `purge-assets` job, which owns the bucket.

Trigger a cron locally while `vp dev` is running:

```bash
curl "http://localhost:3000/cdn-cgi/handler/scheduled?cron=0+3+*+*+*"
```
