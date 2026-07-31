# @stetcms/analytics

## 0.1.0

### Minor Changes

- b2bc001: Product analytics: pageviews and typed custom events, routed through your own backend.

  `@stetcms/analytics` is new. Declare a tracking plan with `defineAnalytics`, mount `createAnalyticsHandler` on one route in your app, and call `createAnalytics(...).track()` from the browser. Events never reach a third-party origin, so there is nothing for a blocker to match on and the reader's address never leaves your infrastructure. The handler derives country, browser, OS, device and a day-scoped visitor digest from the request, and reduces URLs to a pathname plus campaign parameters before anything is stored. No cookies, so no consent banner.

  `@stetcms/config` is new, and this is a breaking change to how projects are configured. `stet.config.ts` now describes the whole integration through `defineStet({ origin, apiKey, output, watch, analytics })`, and both `@stetcms/vite` and `@stetcms/cli` read it, so a plugin option and a CLI flag can no longer disagree. Plugin options and CLI flags still win over the file, which wins over the environment.

  `@stetcms/vite` publishes the tracking plan on dev-server and build start alongside the content codegen, and takes a `config` option pointing at the config file. `@stetcms/cli` gains `stet sync`, and `stet generate` reads the config file too.

### Patch Changes

- b2bc001: Recording events no longer spends the organization's API request quota, and ingest has its own rate limit rather than sharing the one sized for content reads. Analytics traffic is one request per browser batch, so the shared budget would have run out on a normally busy site — and because `track()` never throws, the first symptom would have been data quietly going missing.
- 8b73910: Documented per-framework pageview snippets for TanStack Router, Next.js, React Router, SvelteKit, Nuxt and Astro, and the reason single-page apps should turn `autoPageviews` off: the fallback patches `history.pushState` and so cannot see the `replaceState` a router uses for redirects and search-parameter changes.

  Every snippet passes the router's URL to `pageview()` rather than letting it read `window.location`. By the time an effect or a navigation callback runs, the router has advanced and `window.location` may not have, so a bare call labels the view with the previous page — and the same-URL guard then silently drops every other one. Verified in a browser against the TanStack example, where it was doing exactly that.

- Updated dependencies [b2bc001]
  - @stetcms/config@0.1.0
