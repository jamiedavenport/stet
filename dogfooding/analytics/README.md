# @dogfood/analytics

Stet's own product analytics, on Stet. The tracking plan and the Worker-side
`capture()` live here because both sides of the app need them: `apps/web` for
the browser client and the mounted route, `@repo/auth` for the events that
happen server-side. Everything else is [`@stetcms/analytics`](../../published/analytics),
used exactly the way the docs tell a customer to use it.

- `./plan`: the tracking plan (`analytics`, `Analytics`). Client-safe, no secrets.
- `./server`: the Worker side (`capture`).

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

Adding an event means declaring it here; `capture()` and the browser's
`track()` pick it up with full prop typing, so a typo'd name or a missing prop
fails to compile. `apps/web/stet.config.ts` wraps the plan for the route
handler and the browser client, which is where a customer's own plan would sit.

Identity is deliberately not part of the schemas: the route handler reads the
session and stamps `userId` and `organizationId` onto the batch server-side,
and `capture()` takes them as options. Schemas only describe what happened.

## Worker events

Domain truths are captured where they happen, so an ad blocker or a closed tab
cannot lose them. `@repo/auth` records `signup` (user-create hook),
`organization.created` (organization hook), and `subscription.started` /
`subscription.canceled` (Stripe webhook callbacks):

```ts
import { capture } from '@dogfood/analytics/server';

capture('subscription.started', {
  organizationId: subscription.referenceId,
  props: { plan: plan.name },
});
```

`capture()` validates props against the plan, POSTs one batch to
`/api/v1/events` on the Stet in `STET_ORIGIN`, hands delivery to `waitUntil` so
the response is never blocked, and never throws. Worker events carry no visitor
digest, geo or device, so they count as events and never as visits.

## Browser events

`apps/web/src/analytics/client.ts` holds the browser client, and
`apps/web/src/routes/api/analytics.ts` the route it talks to. Pageviews are the
only thing recorded from the browser today.

## Credentials

One organization API key, from Developers → API keys on the Stet the events go
to. It is read from the `STET_API_KEY` secret, and `STET_ORIGIN` names the
deployment (`apps/web/wrangler.jsonc`).

| Where      | Origin               | Key                                |
| ---------- | -------------------- | ---------------------------------- |
| Production | `STET_ORIGIN` var    | `wrangler secret put STET_API_KEY` |
| Local      | `apps/web/.dev.vars` | `apps/web/.dev.vars`               |

With no key set, `capture()` logs a line saying so and sends nothing, and the
route answers 200 without forwarding. That is the local default: leave
`STET_API_KEY` blank in `.dev.vars` and local traffic stays out of the real
project.

## Tests

`pnpm test` (Vitest) covers the batch the Worker sends. The prop typing,
including the calls that must not compile, is checked by `pnpm tc`.
