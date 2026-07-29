# @stetcms/analytics

Product analytics for apps built on Stet: pageviews and your own typed events,
routed through your backend instead of a third-party endpoint.

- No cookies, so no consent banner.
- No third-party origin in the page, so nothing for a blocker to match on.
- Readers' addresses and user agents never leave your infrastructure.
- One tracking plan types the browser calls, validates the server ones, and
  becomes the event list your content team builds dashboards from.

## Install

```bash
npm install @stetcms/analytics
```

## 1. Declare the tracking plan

The plan goes in `stet.config.ts` at the project root, the one file
`@stetcms/vite` and the `stet` CLI read for everything. Props take any
[Standard Schema](https://standardschema.dev) validator, so Zod, Valibot and
ArkType all work.

```ts
import { defineAnalytics, event } from '@stetcms/analytics';
import { defineStet } from '@stetcms/config';
import { z } from 'zod';

export default defineStet({
  analytics: defineAnalytics({
    events: {
      signup: event({ plan: z.enum(['free', 'paid']) }),
      checkout: {
        started: event(),
        completed: event({ total: z.number(), coupon: z.string().optional() }),
      },
    },
  }),
});
```

Nested events track under dot-joined names (`checkout.completed`). The file
carries no secrets: `STET_API_KEY` and `STET_ORIGIN` are read from the
environment, so it is safe to commit.

## 2. Mount the route

One route in your own app. It validates against the plan, adds what only your
backend can see, and forwards to Stet with your organization API key.

```ts
import { createAnalyticsHandler } from '@stetcms/analytics/server';
import config from '../stet.config';

export const POST = createAnalyticsHandler(config.analytics, {
  // Called per request: whatever you return is attached to every event in the
  // batch, and overrules anything the browser claimed.
  context: async (request) => ({ userId: (await session(request))?.userId }),
});
```

## 3. Track from the browser

The client only ever talks to the route above, so it needs no key.

```ts
import { createAnalytics } from '@stetcms/analytics/client';
import type config from '../stet.config';

export const analytics = createAnalytics<(typeof config)['analytics']>({
  endpoint: '/api/analytics',
});

analytics.track('checkout.completed', { total: 42 });
```

`track` is typed from the plan: a misspelled name, a missing prop or a wrong
type fails the build. It never throws and never rejects, so a tracking mistake
cannot break the page. Events batch and flush every two seconds, when twenty
are queued, and when the page is hidden or unloaded.

## Pageviews

On a site where every navigation is a real page load — plain HTML, Astro
without view transitions, Rails, Django — leave `autoPageviews` on its default
and you are done.

**In a single-page app, turn it off and let your router say what a navigation
is.** The fallback patches `history.pushState`, which cannot see the
`replaceState` that routers use for redirects and search-parameter changes, so
it both misses views and reports the wrong URL for others. Your router already
knows; ask it.

A repeated view of the same URL counts once either way, so the double-invoked
effects of React Strict Mode do not inflate anything.

```ts
export const analytics = createAnalytics<(typeof config)['analytics']>({
  endpoint: '/api/analytics',
  autoPageviews: false,
});
```

Then mount one of these **at the root**, so every page is counted rather than
only the routes that happen to import the client.

**Pass the router's URL, never let `pageview()` read `window.location`.** By
the time your effect or callback runs, the router has advanced and
`window.location` may not have, so a bare `analytics.pageview()` labels the
view with the _previous_ page — and the same-URL guard then quietly drops
every other one. Every snippet below passes it explicitly for that reason.

### TanStack Router

```tsx
import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';

export function usePageviews() {
  const location = useLocation();
  useEffect(() => {
    analytics.pageview(`${window.location.origin}${location.href}`);
  }, [location.href]);
}
```

### Next.js (App Router)

```tsx
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function Pageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    const query = searchParams.toString();
    analytics.pageview(`${window.location.origin}${pathname}${query === '' ? '' : `?${query}`}`);
  }, [pathname, searchParams]);
  return null;
}
```

Render it in `app/layout.tsx`. `useSearchParams` opts the subtree into client
rendering, so wrap it in `<Suspense>` to keep the rest of the layout static.

### React Router

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router';

export function Pageviews() {
  const location = useLocation();
  useEffect(() => {
    analytics.pageview(`${window.location.origin}${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);
  return null;
}
```

### SvelteKit

In `+layout.svelte`:

```svelte
<script>
  import { afterNavigate } from '$app/navigation';
  afterNavigate(({ to }) => analytics.pageview(to?.url.href));
</script>
```

### Nuxt

In a client-only plugin, `plugins/analytics.client.ts`:

```ts
export default defineNuxtPlugin(() => {
  useRouter().afterEach((to) => {
    analytics.pageview(`${window.location.origin}${to.fullPath}`);
  });
});
```

### Astro

Astro navigations are full page loads, so the default is already correct and
there is nothing to add. With view transitions enabled the client script runs
only once, so listen instead — and here a bare call _is_ right, because the
event fires after the swap, when `window.location` is already the new page:

```ts
document.addEventListener('astro:page-load', () => analytics.pageview());
```

## Context vs metadata

Two different trust models, worth keeping straight:

- **`metadata`** is derived by the handler from the request. The browser never
  sends it and cannot influence it.
- **`context`** is merged. The browser proposes, and your handler overrules it
  per key.

So a key your handler does not set stays exactly as the browser sent it, and
anyone can post whatever they like to your route. **Treat a context key as
trustworthy only if your handler sets it.** `userId` in the example above is
safe because the handler resolves it from the session; had it come from the
browser, it would be a claim rather than a fact.

Returning `undefined` for a key leaves the browser's value in place rather than
deleting it, so a missing session reads as "unknown". Pass `null` to state
positively that there is nobody signed in.

## Default metadata

Derived by the handler from the request the browser made to you. The raw
address and user agent are used and discarded there; only what is listed here
is forwarded.

| Field                       | From                                                                    |
| --------------------------- | ----------------------------------------------------------------------- |
| `country`, `region`, `city` | `request.cf` on Cloudflare, `cf-ipcountry` or `x-vercel-ip-*` elsewhere |
| `browser`, `os`, `device`   | `sec-ch-ua*` client hints, falling back to the agent string             |
| `visitor`                   | `SHA-256(date, salt, address, user agent)`, truncated                   |

The visitor digest covers the date, so the same reader is a different id
tomorrow: uniques are countable within a day and nothing can be joined across
days, by anyone, including us. `salt` defaults to the request's host, which
also stops ids being comparable across sites you run.

Traffic that announces itself as automation is answered `200` and discarded,
because a `4xx` only teaches a crawler to retry.

## API

### `@stetcms/analytics`

`defineAnalytics`, `event`, `validateEvent`, `flattenEvents`, `resolveEvent`,
`parseClientBatch`, and the types behind them. Isomorphic.

### `@stetcms/analytics/sync`

`syncTrackingPlan(options)` publishes the plan to Stet. Called for you by
`@stetcms/vite` on dev-server start and at the end of a build, and by
`stet sync`; you rarely call it yourself.

### `@stetcms/analytics/client`

`createAnalytics(options)` → `{ track, pageview, setContext, flush }`.

| Option          | Default  | Meaning                                    |
| --------------- | -------- | ------------------------------------------ |
| `endpoint`      | required | The route you mounted the handler on       |
| `context`       | `{}`     | Props attached to every batch              |
| `flushInterval` | `2000`   | Milliseconds a partial batch waits         |
| `maxBatchSize`  | `20`     | Send immediately once this many are queued |
| `autoPageviews` | `true`   | Pageviews on load and history navigation   |

### `@stetcms/analytics/server`

`createAnalyticsHandler(plan, options)` → `(request: Request) => Promise<Response>`.

| Option    | Default                       | Meaning                                                          |
| --------- | ----------------------------- | ---------------------------------------------------------------- |
| `context` | `{}`                          | Props, or a function of the request, that win over the browser's |
| `origin`  | `STET_ORIGIN`, then the cloud | Stet deployment to forward to                                    |
| `apiKey`  | `STET_API_KEY`                | Organization API key                                             |
| `salt`    | the request's host            | Mixed into the visitor digest                                    |
| `onError` | `console.error`               | Called when a batch cannot be forwarded                          |

Responses: `200 { accepted }` on success, `400` for a malformed batch or an
event that does not match the plan, `502` when Stet could not be reached. An
event outside the plan fails loudly rather than being dropped quietly, so a
typo surfaces the first time it runs.

## Development

```bash
pnpm test   # Vitest
pnpm tc     # Type check
pnpm build  # vp pack
```

`examples/tanstack` runs this package against a local Stet; see its README.
