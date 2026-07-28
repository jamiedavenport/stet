---
title: Organization billing with Stripe
date: 2026-07-23
tags: [billing]
---

Stripe subscriptions per organization: a free plan and a paid plan billed per seat, with the plan catalog and guards in `@repo/billing`. Limits and feature gates are enforced in the UI, in server functions, and in the public API, seat quantities sync automatically as members change, and cancellation runs through the Stripe customer portal. Without Stripe keys configured, checkout is disabled but every guard still works.
