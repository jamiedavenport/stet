---
title: A whole SaaS on one Cloudflare Worker
summary: App, API, auth, jobs, crons, workflows, realtime, and AI in a single deploy. How Onyx uses Cloudflare's primitives, and what that buys you.
author: Jamie Davenport
date: 2026-07-22
tags: [architecture, cloudflare]
---

Most starter kits hand you a fleet: a web app, an API service, a queue worker, a cron runner, and a socket server, each with its own deploy, logs, and failure modes. Onyx takes the opposite bet. Everything runs in a single Cloudflare Worker called `onyx-web`, and the platform's primitives replace the fleet.

## The bindings do the work

The Worker binds to everything it needs:

- **D1** holds the relational data behind a typed Drizzle schema.
- **R2** stores uploaded files.
- **Queues** back the typed background jobs, with a dead-letter queue for the ones that keep failing.
- **Durable Objects** run the stateful pieces: Yjs document rooms for collaborative notes, per-page presence, the notification hub, and the AI chat agent.
- **Cron Triggers** fire the scheduled jobs, and **Workflows** run durable multi-step processes that survive restarts.

Requests, WebSockets, queue messages, cron ticks, and workflow steps all enter through the same codebase with the same types. A background job can call the same data-access functions a route handler uses, because they're the same functions.

## Configuration lives in code

Crons and workflows aren't declared in `wrangler.jsonc`. They're registered in the `@repo/crons` and `@repo/workflows` packages, and the Vite build merges them into the Worker config:

```ts
cloudflare({
  viteEnvironment: { name: 'ssr' },
  config: {
    triggers: { crons: cronsConfig() },
    workflows: workflowsConfig(),
  },
}),
```

Adding a scheduled job is one file in a registry, not a config edit in a second place. The deploy picks it up because `wrangler deploy` reads the build output's config.

## Local dev is the whole platform

`vp run dev` simulates all of it: D1, R2, Queues, Cron Triggers, Workflows, and Durable Objects run locally through the Cloudflare Vite plugin. You can trigger a cron, watch a workflow step through its states, and collaborate with yourself across two browser tabs, all against `localhost:3000`, with no cloud account required.

That matters more than it sounds. Foundations rot where they can't be exercised. When the queue only exists in production, the queue handler is the code nobody touches.

## The honest trade-offs

Single-Worker is a bet on Cloudflare's primitives, and you should know its edges. D1 is SQLite: excellent for the transactional core of a typical SaaS, not a data warehouse. Durable Objects give you strong consistency by pinning state to one location, which is exactly right for a document room and something to think about for global fan-out. And if you outgrow any of it, the seams are already in the code: each capability is a focused package, and the storage, mail, and data layers sit behind interfaces that don't care who fulfills them.

Portability was a design constraint, not an afterthought. But the default is one Worker, because for the first years of most products, one deploy, one log stream, and one bill is a feature.
