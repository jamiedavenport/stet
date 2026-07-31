# @repo/billing

Features, plans, and usage metering for organization billing. The package is a catalog plus guards; the Stripe integration itself is the official [`@better-auth/stripe`](https://better-auth.com/docs/plugins/stripe) plugin, configured in `@repo/auth` next to the other auth plugins.

- `./server`: the shipped features (`ai`, `members`, `apiRequests`, `storage`) with their guards, plus `catalog`, `toPlanName`, `getSubscription`, `usageReport`, and `BillingError`. Nothing else is exported: the `createFeatures`/`definePlan` factories in `src/define.ts` and the entitlement helpers in `src/entitlements.ts` are the catalog's own machinery.
- `./types`: client-safe types (`PlanName`, `FeatureName`, `Usage`, `PlanSummary`). The feature definitions close over database queries, so UI code types against these and receives the data through server functions.

## Features

A feature is defined once, with its measurement logic attached (`src/plans.ts`, next to the plans that price it). `createFeatures(() => plans)` binds the factory to the catalog, so the guards resolve plans without the factories importing them. There are three kinds:

```ts
// Flag: nothing to count, presence in the plan is the entitlement.
export const ai = defineFeature({ name: 'ai', label: 'AI assistant' });

// Counted: usage derived from rows that exist, so deletes free capacity.
export const members = defineFeature({
  name: 'members',
  label: 'members',
  window: null,
  measure: async (organizationId) => {
    /* members + pending invitations */
  },
});

// Metered: a counter in the usage table, maintained by consume().
export const apiRequests = defineFeature({
  name: 'apiRequests',
  label: 'API requests',
  meter: { window: 'month' },
});
```

The `storage` feature is counted too, and shows why the unit matters: it sums
the bytes of an organization's uploaded assets but reports megabytes, because
a cap reads back to the user in the guard's error message ("limited to 100 MB
of storage"). Rounding happens once over the total, not per file.

`window: 'month'` buckets usage by calendar month (UTC) and resets at the boundary; `null` means usage never resets. Counted features receive the window start in `measure(organizationId, since)` and reach the database with `database()`; metered features bucket their counter rows (`usage` in `@repo/db`) by period key.

Every feature is listed in the `features` registry, which drives the usage report and the `FeatureName` union.

## Plans

Plans compose one entitlement per feature (`src/plans.ts`), and the check is compile-time exhaustive: omitting a feature fails the build naming what is missing, so a plan must price, cap, or explicitly exclude everything.

```ts
const free = definePlan({
  name: 'free',
  label: 'Free',
  pricePerSeat: 0,
  features: [members.limit(3), apiRequests.limit(1_000), storage.limit(100), ai.excluded()],
});

const paid = definePlan({
  name: 'paid',
  label: 'Paid',
  pricePerSeat: 10,
  features: [members.limit(25), apiRequests.limit(100_000), storage.limit(10_000), ai.included()],
});

export const plans = [free, paid] as const;
```

Flags offer `included()` and `excluded()`; counted and metered features offer `limit(n)`, `unlimited()`, and `excluded()`. The first plan is the default for organizations without an active subscription. Add a feature by defining it and adding it to the `features` list (the compiler then walks you through every plan); add a plan by defining it, listing it, and registering its Stripe price in the `stripe()` plugin config in `@repo/auth`.

## Guards

Guards are methods on the feature objects. The database is ambient (the worker's D1 binding via `cloudflare:workers`), the organization is always explicit:

```ts
import { ai, apiRequests, members, usageReport } from '@repo/billing/server';

await ai.can(organizationId); // boolean
await ai.require(organizationId); // throws BillingError
await members.require(organizationId); // room for one more, counting pending invites
await members.cap(organizationId); // number, null when unlimited, 0 when excluded
await apiRequests.consume(organizationId, 3); // atomic check + record, throws over cap
const usage = await usageReport(organizationId); // [{ feature, used, cap, window }]
```

`can` and `require` accept an optional `n` for headroom checks (`members.can(orgId, 5)`). `consume` is one conditional upsert, so concurrent requests cannot race past the cap. `BillingError` carries a `code` (`feature-unavailable` or `limit-reached`), the `plan`, and the `feature`; callers map it onto their layer's error shape. Where the checks run today:

| Layer            | Location                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Better Auth      | `membershipLimit` + `beforeCreateInvitation` in `@repo/auth` use `members`                |
| Worker routes    | `apps/web/src/server.ts` gates the AI agent WebSocket with `ai`                           |
| Public API       | the authenticated middleware consumes one `apiRequests` unit per request (429 over cap)   |
| Server functions | `getOrgBilling` in `apps/web/src/organization/functions.ts` resolves plan, catalog, usage |
| UI               | the billing card on `/app/organization` and the upgrade prompt on `/chat`                 |

`GET /api/v1/org/billing` reports the plan, subscription state, and the usage report.

## How billing flows work

Subscriptions belong to organizations (`subscription.referenceId` is the organization id) and only owners and admins can manage them. Upgrades run through Stripe Checkout, cancellation through the Stripe billing portal (taking effect at period end), and `authClient.subscription.restore` clears a pending cancellation. The paid plan is seat-only: checkout bills one unit per member and the plugin re-syncs the quantity whenever members join or leave. Webhooks land on `/api/auth/stripe/webhook` and keep the `subscription` table in `@repo/db` authoritative.

Metered features are quota enforcement only: nothing is reported to Stripe. Usage-based Stripe prices (overage billing) would bolt on with a reporting cron and a `lineItems` entry in the plugin's plan config.

## Local development

The guards and all plan-gated UI work with no Stripe credentials: they read the `subscription` and `usage` tables, and the local seed puts the seed organization on the paid plan. Without `STRIPE_SECRET_KEY`, checkout is simply disabled.

To run real checkout locally, use the [Stripe CLI](https://docs.stripe.com/stripe-cli) against a sandbox:

```bash
stripe login    # pick your sandbox
stripe prices create --currency=usd --unit-amount=1000 \
  -d "recurring[interval]=month" -d "product_data[name]=Stet Paid" -d "lookup_key=stet-paid"
stripe listen --forward-to http://localhost:3000/api/auth/stripe/webhook
```

The lookup key makes the price findable later (`stripe prices list --lookup-keys stet-paid`), so the create step never needs repeating. Keep `stripe listen` running while you develop; it forwards webhooks to the dev server. Set the three values in `apps/web/.dev.vars` and restart `vp dev`:

```
STRIPE_SECRET_KEY=sk_test_...      # sandbox secret key
STRIPE_WEBHOOK_SECRET=whsec_...    # printed by `stripe listen`
STRIPE_PRICE_PAID=price_...        # the price created above
```

Pay with Stripe's test card (4242 4242 4242 4242, any future expiry and CVC).

## Keeping prices in sync

Stripe's price object is what customers are charged; `pricePerSeat` in `src/plans.ts` is what the UI displays. They are linked by convention, not machinery: when the price changes, create a new Stripe price (moving the lookup key with `-d transfer_lookup_key=true`), point `STRIPE_PRICE_PAID` at it, and update `plans.ts` in the same change.

## Tests

`pnpm test` (Vitest) covers the catalog and every guard against a real sqlite database with the real schema pushed into it, injected with `setDatabase()` from `@repo/db` in place of the worker's D1 binding. Plan gating end to end (billing page states, the member limit, the AI gate, API request metering) runs without credentials in `apps/web/e2e/billing.spec.ts` and `api.spec.ts`.
