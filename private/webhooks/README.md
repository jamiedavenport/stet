# @repo/webhooks

Outbound webhooks on the platform's own primitives: per-organization endpoints in D1, delivery on the jobs queue, and [Standard Webhooks](https://www.standardwebhooks.com) signatures receivers can verify with any off-the-shelf library.

- Organizations register endpoints (URL + subscribed event types) from the `/app/webhooks` settings page or the public API; each endpoint gets a `whsec_` signing secret.
- Define event types in `src/events/` (a Zod payload schema) and register them in `src/registry.ts`; `emitWebhookEvent()`, the delivery job, the API contract's event enum, and the settings UI all pick them up.
- `emitWebhookEvent({ organizationId, type, payload })` from `./client` is server-only (like `enqueue` in `@repo/jobs`) and costs one queue send regardless of how many endpoints an organization has. The event id and timestamp are fixed at emit time, so `webhook-id` is stable across retries and receivers can dedupe.
- The `deliver-webhook` job fans out to enabled endpoints subscribed to the event, POSTs `{ type, timestamp, data }` with the Standard Webhooks headers (HMAC-SHA256 over `id.timestamp.body`), and records every attempt in `webhook_delivery`. That ledger makes queue retries idempotent: endpoints that already succeeded are skipped.
- Failures throw, so the queue redelivers with backoff up to `max_retries` and then dead-letters. Five consecutive failures (or a `410 Gone`) disable the endpoint; re-enabling resets the counter. Deliveries that outlive the queue's retries can be re-queued from the settings page with their original `webhook-id`.
- The delivery ledger is swept nightly by a cron in `@repo/crons`: rows untouched for 30 days (`deliveryRetentionDays`) are deleted.
- Secret rotation keeps the previous secret signing for 24 hours (two space-delimited signatures in `webhook-signature`), so receivers can roll over without dropping deliveries.
- Ships `content.changed` (batched, below), `member.joined`, `invitation.created`, `subscription.started`, `subscription.canceled` (emitted from `@repo/auth` hooks), and `ping` for test sends.

## Batched content changes

`content.changed` is the rebuild trigger, so it is deliberately not one delivery per edit: a receiver like Vercel would redeploy on every keystroke.

- Every content operation in `@repo/content` calls `recordContentChange(organizationId, change)` from `./content`, which lands in that organization's `ContentChangeBatch` Durable Object (binding `CONTENT_CHANGES`). It is best-effort: a batch that cannot be reached is reported to Sentry, never raised at the editor who was saving.
- The batch holds one record per subject, so an editing session on one entry is one line in the payload. A subject created and then edited inside the window still reports `created`; created and then deleted reports `deleted`.
- A single alarm closes the window after `WEBHOOKS_BATCH_SECONDS` (wrangler var, 60 by default; override in `.dev.vars` to watch a rebuild fire quickly) and emits one event through `emitWebhookEvent()`. The alarm is armed only when none is pending and never pushed back by a new change, so continuous editing still flushes once per window.
- Past `maxBatchChanges` records the batch stops growing and sets `truncated`, which is the signal to resync rather than read the list. A site import lands here.

## Adding an event type

```ts
// src/events/task-completed.ts
export const taskCompleted = defineWebhookEvent({
  type: 'task.completed',
  schema: z.object({ taskId: z.string(), title: z.string() }),
});

// Any server-side call site (payload typed from the schema):
await emitWebhookEvent({
  organizationId,
  type: 'task.completed',
  payload: { taskId, title },
});
```

Add the new type to `src/registry.ts` and to the inlined event enum in `private/api/src/contract.ts` (that file stays free of workspace imports so OpenAPI generation can run it under Node). The registry carries a `satisfies` check against the contract enum, so forgetting either side is a compile error, not silent drift.

## Verifying deliveries (receiver side)

```ts
import { Webhook } from 'standardwebhooks';

const webhook = new Webhook(secret); // whsec_... from the settings page
const event = webhook.verify(rawBody, {
  'webhook-id': request.headers.get('webhook-id'),
  'webhook-timestamp': request.headers.get('webhook-timestamp'),
  'webhook-signature': request.headers.get('webhook-signature'),
});
```

`verify` checks the signature and rejects timestamps outside a five-minute window. Always verify against the raw request body, not a re-serialized copy.
