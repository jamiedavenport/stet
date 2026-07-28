# @repo/workflows

Durable multi-step processes on Cloudflare Workflows, with per-step retries and long sleeps.

- Define workflows in `src/workflows/` and register them in `src/registry.ts`. The registry is the single source of truth: the wrangler `workflows` config is generated from it at build time, so adding a workflow never touches `wrangler.jsonc`.
- Start runs with the typed `./client` (`startWorkflow`), and stop a chain by its stable id with `terminateWorkflow` (idempotent; used by the reminder emails' one-click unsubscribe). The workflow classes are exported from `apps/web/src/server.ts`.
- Ships `invitation-reminder`: started when an organization invite is sent, it sleeps until a day before the invite expires and nudges the invitee if they still have not responded.

Local dev simulates workflows through the Vite plugin.
