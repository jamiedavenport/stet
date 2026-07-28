---
title: Per-seat billing with plan guards at every layer
summary: Stripe subscriptions per organization, a plan catalog both the UI and the server trust, and why feature gates that only live in the frontend are billing bugs waiting to happen.
author: Jamie Davenport
date: 2026-07-23
tags: [billing, stripe]
---

Billing bugs are trust bugs. Charge for a seat you didn't add, or let a free organization use a paid feature, and the damage isn't the dollar amount, it's the audit that follows. So when we added organization billing to Onyx, the design goal wasn't checkout. It was making the plan rules impossible to enforce inconsistently.

## One catalog, every layer

The plan catalog lives in `@repo/billing`, and every plan must say something about every feature or it doesn't compile:

```ts
export const free = definePlan({
  name: 'free',
  label: 'Free',
  pricePerSeat: 0,
  features: [members.limit(3), apiRequests.limit(1_000), ai.excluded()],
});

export const paid = definePlan({
  name: 'paid',
  label: 'Paid',
  pricePerSeat: 10,
  features: [members.limit(25), apiRequests.limit(100_000), ai.included()],
});
```

Guards like `ai.require(organizationId)` and `members.can(organizationId)` are methods on the features themselves, so the measurement logic lives next to the thing it measures. The React components, the server functions, and the public API all resolve against the same catalog. When the billing page says the free plan allows three members, that's not copy, it's the limit, rendered.

## Guards where they can't be skipped

The UI gates features first, because good products explain themselves: the AI assistant page shows an upgrade prompt on the free plan instead of a dead chat box. But the UI is a courtesy, not a boundary. The same checks run in the server functions that do the work, and in the public API, where an organization's key can't invite a fourth member on the free plan no matter what client sends the request.

Member limits count pending invitations too. If they didn't, the limit wouldn't be a limit; it'd be a suggestion with a race condition.

## Stripe as the source of subscription truth

Subscriptions attach to organizations, not users, through Better Auth's Stripe plugin. Checkout and the customer portal are Stripe-hosted, and four webhook events keep the local subscription state current. Per-seat quantity syncs when membership changes, so the invoice tracks reality without anyone remembering to update it.

Cancellation deliberately runs through Stripe's portal rather than a custom flow: fewer ways to disagree with the processor about what state a subscription is in.

## Degrading gracefully

Two details that only matter until they really matter:

- **No Stripe keys, no problem.** Without `STRIPE_*` configured, checkout is disabled but every guard still works. New environments and CI don't need billing secrets to be correct about limits.
- **Tested like a user, not a mock.** The Playwright suite signs up a fresh organization, verifies it starts on the free plan, watches the third invite get blocked, and confirms the AI assistant is gated. The test asserts the product's promises, not the implementation's internals.

The pattern generalizes past billing: put the rule in one importable place, enforce it at every boundary, and make the UI reflect it rather than re-state it. Billing is just where getting this wrong costs the most.
