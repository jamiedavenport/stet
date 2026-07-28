# @repo/analytics

Type-safe product analytics on [OpenPanel](https://openpanel.dev). The package is an in-repo tracking plan plus thin wrappers around the official OpenPanel SDKs: a Zod event registry types every capture call on both the browser and the Worker, and identity (user, organization) flows automatically from the session.

- `./events`: the tracking plan (`registry`, `EventName`, `EventProperties`). Client-safe, no secrets.
- `./client`: the browser side (`initAnalytics`, `track`, `identifyUser`, `setActiveOrganization`, `clearAnalyticsIdentity`) on `@openpanel/web`.
- `./server`: the Worker side (`capture`, `identifyUser`, `upsertOrganizationGroup`) on `@openpanel/sdk`.

## The tracking plan

`src/events.ts` is the single source of truth. Each event pairs a snake_case past-tense name with a Zod schema for its properties:

```ts
export const subscriptionStarted = defineEvent({
  name: 'subscription_started',
  schema: z.object({ plan: z.string() }),
});
```

Adding an event means defining it and listing it in the registry; `track()` and `capture()` pick it up with full property typing, so a typo'd name or a missing property fails to compile. Identity is deliberately not part of the schemas: the client stamps it via identify/group state and the server takes it in `capture()`'s options, so schemas only describe what happened.

## Browser events

The `Analytics` component in `apps/web` (mounted once in the root route) initializes the client and keeps identity in sync with the session context: `identifyUser` on sign-in, `setActiveOrganization` when the active organization changes (an OpenPanel group plus an `organizationId` global property), and `clearAnalyticsIdentity` on sign-out. Screen views and outgoing links are tracked automatically.

Recording an interaction event is one typed call:

```ts
import { track } from '@repo/analytics/client';

track('task_created');
```

## Worker events

Domain truths are captured where they happen, server-side, so ad blockers and closed tabs cannot lose them. `@repo/auth` captures `user_signed_up` (user-create hook), `organization_created` (organization hook), and `subscription_started` / `subscription_canceled` (Stripe webhook callbacks):

```ts
import { capture } from '@repo/analytics/server';

capture('subscription_started', {
  organizationId: subscription.referenceId,
  properties: { plan: plan.name },
});
```

`capture()` validates properties against the registry, hands delivery to `waitUntil` so the response is never blocked, and never throws. `organizationId` becomes both an OpenPanel group and an event property; `userId` becomes the profile id.

## Credentials

Two values from OpenPanel (Settings → Clients): the public client id and the secret.

| Where      | Client id                                              | Secret                                        |
| ---------- | ------------------------------------------------------ | --------------------------------------------- |
| Production | `OPENPANEL_CLIENT_ID` var in `apps/web/wrangler.jsonc` | `wrangler secret put OPENPANEL_CLIENT_SECRET` |
| Local      | `apps/web/.dev.vars`                                   | `apps/web/.dev.vars`                          |

With either value missing, both sides fall back to logging events as `[analytics]` console lines, which is the recommended local default (set `OPENPANEL_CLIENT_ID=""` in `.dev.vars`); e2e assertions can read them from the dev-server log. To send real events from local dev instead, put real credentials in `.dev.vars` and add your localhost origin to the client's allowed domains in the OpenPanel dashboard; browser events from unlisted origins are rejected with a 401 (Worker events carry the secret and are always accepted).

## Tests

`pnpm test` (Vitest) covers the registry contract, the property typing (including compile-time failures via `@ts-expect-error`), and the console fallback.
