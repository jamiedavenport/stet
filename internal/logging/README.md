# @repo/logging

Structured logging on [evlog](https://www.evlog.dev). The package is the repo's field vocabulary plus one-time configuration around evlog's Workers entry: background work accumulates context into a single wide event and emits it once, so one row in Workers Logs tells the whole story of a job, cron run, or webhook delivery.

- `initLogging({ service, production })`: configures the isolate. Called once at module scope in `apps/web/src/server.ts`.
- `createLogger(context?)`: starts a wide event, typed against `StetEvent`.
- `log`: evlog's standalone logger, re-exported for the rare line that belongs to no unit of work.
- `ExpectedFailure`: a failure that is normal operation, logged but kept out of Sentry.
- `StetEvent`, `StetEventContext`, `Logger`: the field vocabulary, what the logger accepts, and the logger type.

## Wide events

A wide event is one log line per unit of work, carrying everything known about it, instead of a scatter of lines that have to be stitched back together. Create it at the entry point — one per queue message, cron run, or webhook event — build it up as the work progresses, and emit once in a `finally`, so failures are recorded as well as successes:

```ts
import { createLogger } from '@repo/logging';

const log = createLogger({ job: { name: 'send-welcome-email', messageId: message.id } });
try {
  log.set({ organization: { id: organizationId } });
  await run();
} catch (error) {
  log.error(error);
  throw error;
} finally {
  log.emit();
}
```

## One event, however deep the work goes

`emit()` writes a single line, and a unit of work should call it exactly once. Deeper functions do not start their own event: pass the logger down and let them add to the one that already exists. `info()` and `warn()` are how they record steps, and neither prints when called — both fold into the pending event and ride along on that one line:

```ts
const log = createLogger({ job: { name: 'send-welcome-email' } });
log.info('resolved the recipient');
log.warn('retrying the mail provider');
log.emit({ status: 200 });
```

```jsonc
{
  "job": { "name": "send-welcome-email" },
  "requestLogs": [
    { "level": "info", "message": "resolved the recipient", "timestamp": "..." },
    { "level": "warn", "message": "retrying the mail provider", "timestamp": "..." },
  ],
  "status": 200,
  "duration": "2ms",
  "level": "warn", // promoted by the warning, and routed to console.warn
}
```

So narrate freely; it costs no extra lines. Reaching for a second event usually means the function is really two units of work. For something genuinely unattached to a unit of work, such as a one-off diagnostic or a startup notice that a feature is unconfigured, `log` writes a standalone tagged line instead: `log.info('analytics', 'events are dropped: STET_API_KEY is unset')`.

## The vocabulary

`StetEvent` in `src/index.ts` is the shared vocabulary (`user`, `organization`, `job`, `cron`, `workflow`, `webhook`). Add a field by extending the type.

Every field is optional at the call site: the type declares the shape, and evlog makes it deeply partial, so each log sets only the subset it knows about. What it does not permit is drift. The initial context, `set()`, and `emit()` are all checked against the same vocabulary, so `job.nmae` and `attempt: 'first'` fail to compile and `job.name` means the same thing in every query. evlog itself types the initial context as `Record<string, unknown>`; narrowing it to `StetEventContext` is the main reason this wrapper exists, since the identifiers most call sites open with are passed there.

## Why objects, not strings

`initLogging` configures evlog with `stringify: false`, so events reach the console as objects. Workers Logs indexes an object's fields, which is what makes the [Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/) able to filter on `job.name` or group by `job.attempt`; a JSON string would be one opaque blob. Events route to the console method matching their level, so an error event lands on `console.error`.

`production: true` also switches on evlog's auto-redaction, which scrubs emails, tokens, and card numbers from events before they are written. It is passed explicitly because evlog infers the environment from `process.env.NODE_ENV`, which workerd does not set.

## Scope

Background work only: the queue consumer, cron runner, and webhook delivery. HTTP requests are already covered by Cloudflare's own invocation logs and traces, so there is no request middleware here and nothing to thread through TanStack Start. Errors additionally go to Sentry from `apps/web`; see [Observability](../../DEPLOY.md#observability) for how the two fit together.

To ship events somewhere other than Workers Logs, pass a drain to `initWorkersLogger` in `src/index.ts`: evlog has adapters for Axiom, OTLP (Grafana, Honeycomb, Datadog), and Better Stack. Nothing at the call sites changes.

## Tests

`pnpm test` (Vitest) covers the object-not-string output, production redaction, context accumulation across a unit of work, and error events. The vocabulary is checked at compile time too: `@ts-expect-error` cases assert that an unknown or mistyped field is rejected by the initial context, `set()`, and `emit()` alike.
