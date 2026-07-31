# @dogfood/analytics

Stet's own product analytics, on Stet. Nothing here implements analytics: it is
the tracking plan a customer would write, plus the ten lines of Worker glue
around [`@stetcms/analytics`](../../published/analytics) that a customer on
Cloudflare would write too.

- `./plan`: the tracking plan (`analytics`, `Analytics`). Client-safe, no secrets.
- `./server`: `capture()`, for events that happen in the Worker.

## The tracking plan

`src/plan.ts` is the single source of truth. Names nest and flatten to
dot-notation on the wire:

```ts
export const analytics = defineAnalytics({
  events: {
    signup: event(),
    organization: { created: event() },
    subscription: { started: event({ plan: z.string() }), canceled: event({ plan: z.string() }) },
  },
});
```

Adding an event means declaring it here; both sides pick it up with full prop
typing, so a typo'd name or a missing prop fails to compile.
`apps/web/src/stet.config.ts` wraps the plan for the mounted route and the
browser client, which is where a customer's own plan would sit.

## One path, one key

The browser client is isomorphic — it guards its listeners and its automatic
pageviews behind a `window` check and takes a `fetch` — so the Worker uses the
same `createAnalytics` the browser does, pointed at an absolute URL instead of
a path. Everything goes through the route mounted at
`apps/web/src/routes/api/analytics.ts`, which is the only place holding the API
key, and the only place that talks to Stet.

```ts
import { capture } from '@dogfood/analytics/server';

capture({ organizationId: subscription.referenceId }, 'subscription.started', {
  plan: plan.name,
});
```

Context comes first because it is per-call: `createAnalytics` fixes context at
construction, so `capture()` builds a client per call rather than let two
requests in one isolate stamp each other's identity on. `flush()` goes to
`waitUntil`, since the browser's own flush triggers (`pagehide`,
`visibilitychange`) never fire on a server.

Recording server-side is what stops an ad blocker or a closed tab losing a
signup. `@repo/auth` records `signup`, `organization.created`,
`subscription.started` and `subscription.canceled`.

## Credentials

None here. The route holds them: `STET_ORIGIN`, a var in
`apps/web/wrangler.jsonc`, and `STET_API_KEY`, a Worker secret set with
`wrangler secret put`. With no key the route answers 200 and drops the batch,
which is the local default.

## Tests

`pnpm test` covers the plan's wire names. The prop typing, including the calls
that must not compile, is checked by `pnpm tc`.
