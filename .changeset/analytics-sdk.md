---
'@stetcms/analytics': minor
'@stetcms/config': minor
'@stetcms/client': minor
'@stetcms/vite': minor
'@stetcms/cli': minor
---

Product analytics: pageviews and typed custom events, routed through your own backend.

`@stetcms/analytics` is new. Declare a tracking plan with `defineAnalytics`, mount `createAnalyticsHandler` on one route in your app, and call `createAnalytics(...).track()` from the browser. Events never reach a third-party origin, so there is nothing for a blocker to match on and the reader's address never leaves your infrastructure. The handler derives country, browser, OS, device and a day-scoped visitor digest from the request, and reduces URLs to a pathname plus campaign parameters before anything is stored. No cookies, so no consent banner.

`@stetcms/config` is new, and this is a breaking change to how projects are configured. `stet.config.ts` now describes the whole integration through `defineStet({ origin, apiKey, output, watch, analytics })`, and both `@stetcms/vite` and `@stetcms/cli` read it, so a plugin option and a CLI flag can no longer disagree. Plugin options and CLI flags still win over the file, which wins over the environment.

`@stetcms/vite` publishes the tracking plan on dev-server and build start alongside the content codegen, and takes a `config` option pointing at the config file. `@stetcms/cli` gains `stet sync`, and `stet generate` reads the config file too.
