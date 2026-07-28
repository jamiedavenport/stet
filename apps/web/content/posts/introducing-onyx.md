---
title: Introducing Onyx
summary: A full-stack TypeScript starter kit on Cloudflare. Auth, organizations, billing, a public API, realtime, AI, and background work, already wired together and tested.
author: Jamie Davenport
date: 2026-07-23
tags: [announcement]
featured: true
---

Every SaaS starts the same way. Before you write a line of the product, you write sign-up and sign-in, email verification, password reset, organizations, invitations, member management, subscriptions, webhooks, file uploads, transactional email, a public API, background jobs, and a test suite to keep it all honest. Weeks of work that your users will only notice if it's broken.

Onyx is that foundation, finished. It's the starter kit we use at [jxd.dev](https://jxd.dev) to take products from idea to production in weeks, and it's now available as a template you can own outright.

## What's inside

One Cloudflare Worker runs the whole platform:

- **Authentication** with email verification and password reset, on Better Auth.
- **Organizations** with invitations, roles, and member management.
- **Billing** with Stripe: free and paid plans, per-seat pricing, and plan guards enforced in the UI, in server functions, and in the public API.
- **A public REST API** defined contract-first with oRPC and Zod, with organization-scoped API keys, a generated OpenAPI reference, a typed client on npm, and a CLI with browser login.
- **Files** on R2, **email** with React Email and Resend, **realtime collaboration** and presence on Durable Objects, and an **AI assistant** on the Cloudflare Agents SDK.
- **Background work**: scheduled jobs on Cron Triggers, queue-backed jobs, and durable multi-step workflows.
- **An accessible UI library** (shadcn/ui on Base UI with Tailwind v4), end-to-end tests, CI with bundle-size budgets, and automated npm releases.

Each piece lives in a focused package with its own README, so you can understand, replace, or delete any of them without archaeology.

## The ideas behind it

**One Worker.** The app, the API, auth, jobs, crons, and workflows deploy as a single Cloudflare Worker. One `wrangler deploy`, one thing to observe, no service mesh between you and production. Local dev simulates all of it with one command.

**Typed end to end.** The Drizzle schema, the server functions, the API contract, and the published client share one type system. Rename a column and the compiler walks you through every place that cares, from the database to the CLI.

**Own everything.** Onyx is code in your repository, not a platform you rent. There's no SDK phoning home, no upgrade treadmill you didn't choose, and nothing stopping you from deleting the parts you don't need.

**Production-grade from the first commit.** Playwright covers the real flows (sign-up, invitations, billing limits, collaboration), CI enforces types, tests, and bundle budgets, and the docs site ships with an OpenAPI reference generated from the actual contract.

**Legible to AI agents.** Focused packages, per-package READMEs, conventional commits, and a maintained CLAUDE.md mean coding agents navigate Onyx well. It's the difference between an agent that guesses and an agent that ships.

## Where it's going

Onyx is the same foundation we build client products on, so it improves whenever our work does. The [changelog](/changelog) tracks what ships, and the [blog](/blog) covers the engineering decisions as they happen: the single-Worker architecture, the type pipeline from D1 to npm, and how plan guards keep billing honest at every layer.

If you want the foundation without the weeks, [see how to get Onyx](/#pricing). If you'd rather we build the product too, that's [what JXD does](https://jxd.dev).
