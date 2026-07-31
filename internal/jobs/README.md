# @repo/jobs

Fire-and-forget background jobs on Cloudflare Queues.

- Define jobs in `src/jobs/` with a Zod payload schema and register them in `src/registry.ts`.
- `enqueue('job-name', payload)` from `./client` is typed from the registry; payloads are re-validated on consume.
- Failures retry with backoff (5 attempts) and then land in the `stet-jobs-dlq` dead letter queue.
- Ships `send-welcome-email`, enqueued on signup, and `purge-assets`, enqueued when an organization or account is deleted (the foreign keys clear the `asset` table, but nothing in D1 reaches into R2) and by the abandoned-upload sweep in `@repo/crons`.
- Handlers receive a `JobContext` built once per batch: the mailer, the app's base URL, and the R2 bucket. The bucket is typed structurally to the two methods jobs use, because `@cloudflare/workers-types`' nominal `R2Bucket` does not match the wrangler-generated globals apps are typed against.

The consumer is the `queue` handler in `apps/web/src/server.ts`. Local dev simulates the queue; production queues are created once (see [DEPLOY.md](../../DEPLOY.md)).
