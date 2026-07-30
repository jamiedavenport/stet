# @repo/analytics

The store behind Stet's product analytics: one Durable Object per
organization, holding its events in embedded SQLite.

Events arrive from `@stetcms/analytics` running in the customer's own backend
(see `published/analytics`), through `POST /api/v1/events`. This package owns
what happens after that: storage, rollups, retention, and every query the
dashboard draws.

- `.`: the schema, ingest and query functions, working against any SQLite
  drizzle database, so they are unit-testable without a Worker.
- `./store`: the `AnalyticsStore` Durable Object, bound as `ANALYTICS`.

## Why not D1

Event traffic is append-heavy and unbounded, and D1 holds the content every
request in Stet already reads. One organization's launch day should not slow
down anyone else's editor. A Durable Object per organization also puts each
one's data on its own storage, which is the isolation the data deserves
anyway.

## Storage

| Table          | Holds                                          |
| -------------- | ---------------------------------------------- |
| `events`       | One row per event, kept for 90 days            |
| `rollups`      | Hourly counts per dimension, kept indefinitely |
| `rollup_state` | The watermark dividing the two                 |

An alarm folds every closed hour into `rollups` and advances the watermark,
then prunes raw events past retention. Queries read rollups before the
watermark and raws after it, so a range spanning the boundary reads the same
either side of a rollup.

Counts are written with overwrite semantics, so an alarm that dies mid-run
recomputes its window rather than doubling it. Ingest clamps timestamps into
`[watermark, now + 5m]`: behind the watermark a row would be invisible and
pruned unseen.

Distinct visitors are the exception. A count of distinct things cannot be
summed from per-hour totals, so uniques read raws only and are exact within
the retention window.

## Dimensions

`DIMENSIONS` in `dimensions.ts` maps each breakdown to the column it counts:
`event`, `path`, `referrer`, `country`, `device`, `browser`, `os`, `source`,
`campaign`. One mapping drives ingest, rollup and query, so adding a
breakdown is a line there plus a column on `events`.

`event` counts every event; the rest count page views only, because mixing
custom events into "top pages" makes the number mean nothing in particular.

## What is not stored

URLs are reduced to a pathname plus `utm_source`, `utm_medium` and
`utm_campaign` at ingest, so a query string carrying a token or an email
address never reaches storage. Addresses and user agents never arrive at all:
the customer's handler hashes them into a day-scoped visitor digest and keeps
the inputs.

## Demo traffic

A new store is empty, so the dashboard demos as a blank chart. With `vp dev`
running and the database seeded (`pnpm --filter @repo/db seed`), backfill a
month of synthetic traffic for the seeded organization:

```bash
pnpm seed
```

It reads the seeded model through `/api/v1/model` and sends its traffic to
the pages those entries are served on, so per-entry numbers point at content
that exists: examples/tanstack serves the `posts` collection at
`/blog/<slug>` and the `landing` map at `/`. Each visit is one POST to
`/api/v1/events`, the endpoint a customer's mounted handler posts to, so
rollups and retention behave the way they will in production.

`src/synthetic.ts` shapes it, deterministically from a seed: a working-week
rhythm over a gentle upward trend, one day the site is discovered and traffic
spikes, and the example app's `post.read`, `post.finished` and `subscribe` on
top of the pageviews. `--origin`, `--key`, `--site`, `--days` and `--seed`
point it elsewhere; `STET_ORIGIN` and `STET_API_KEY` are read too.

Traffic adds to whatever the store already holds, so a second run leaves two
months stacked. Worse, once the alarm has folded an hour into rollups, ingest
clamps anything older to that watermark and a reseed piles the whole month
into one bucket. For a clean start delete `apps/web/.wrangler/state`, which
resets the local D1 database as well, and seed both again.

## Schema changes

`schemaStatements` is applied by the Durable Object on wake and by the tests
to an in-memory database, so both run the same DDL. Pre-release, changing a
table means editing it there and accepting that existing stores keep the old
shape until reset. Once other people deploy their own instances this needs
committed migrations, the same switch [private/db](../db) documents.

## Tests

```bash
pnpm test   # Vitest, against better-sqlite3 in memory
pnpm tc
```
