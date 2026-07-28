---
title: 'End-to-end types: from D1 schema to published client'
summary: One type system runs from the database columns to the npm package your users install. How Drizzle, oRPC, and Zod line up so a schema change can't ship half-done.
author: Jamie Davenport
date: 2026-07-21
tags: [typescript, api]
---

The promise of "type-safe" gets made a lot. Here's what it concretely means in Onyx: the database schema, the server, the OpenAPI document, the published client, and the CLI are one connected type system. Change a column and the compiler tells you every layer that cares, in order, until the change is complete.

## Layer one: the schema

Tables are defined once with Drizzle against D1:

```ts
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  // ...
});
```

Every query in the data-access layer infers its row types from these definitions. There is no ORM model class to keep in sync; the schema is the source of truth.

## Layer two: the contract

The public API is contract-first with oRPC. The contract file declares routes, inputs, outputs, and errors with Zod, and deliberately describes the wire format rather than the database:

```ts
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

const getOrg = oc
  .errors(authErrors)
  .route({
    method: 'GET',
    path: '/org',
    summary: 'Current organization',
    tags: ['Organization'],
  })
  .output(organizationSchema);
```

Note `createdAt: z.iso.datetime()`. Dates travel as ISO 8601 strings, so the contract describes exactly what crosses HTTP, and the generated OpenAPI document is honest instead of hopeful.

The server then implements the contract. If the implementation drifts from the declaration, it doesn't compile. Authentication is organization-scoped API keys in an `x-api-key` header, checked before any procedure runs.

## Layer three: the client and CLI

From the same contract, Onyx generates the OpenAPI reference in the docs and publishes `@jxdltd/onyx-client`, a typed client where responses come back as the contract's inferred types:

```ts
import { createClient } from '@jxdltd/onyx-client';

const client = createClient({ apiKey: process.env.ONYX_API_KEY });
const org = await client.org.get();
//    ^? { id: string; name: string; slug: string; ... }
```

The `onyx` CLI is built on that client, with a device-flow browser login so keys never get pasted into terminals.

## Why the chain matters

Suppose you add a `plan` field to the organization the API returns. The compiler's path is fixed: the contract schema gains the field, the server implementation fails to compile until it provides it, the OpenAPI document regenerates on build, and the next client release types it for consumers. There is no step where a stale handwritten type quietly lies to someone.

Types don't replace tests; Onyx has plenty of both. But types are the difference between refactoring being a search problem and being a compiler conversation. Across a database, a Worker, a published package, and a CLI, that conversation is the feature.
