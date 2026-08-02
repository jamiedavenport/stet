# @stetcms/client

## 0.2.0

### Minor Changes

- dface7a: Rich text fields now contain both sanitised HTML and markdown. Generated clients
  type them as `ContentRichText`, and the content client resolves Stet asset URLs
  inside both representations so bodies can be rendered without another markdown
  dependency.

### Patch Changes

- 5d6757e: Make `entryTypeName` index-free so the codegen source type-checks in projects
  with `noUncheckedIndexedAccess`, such as Nuxt's generated tsconfig.
- 01cabe9: Package metadata now describes what these packages are to someone who has never
  heard of Stet, and every README links into the documentation.

  Each `description` names the category once, and the keyword sets carry `cms`,
  `headless-cms` and `stetcms` so an npm search for the category finds them at all;
  previously the only shared keyword was `stet`, a brand with nothing behind it yet.
  `homepage` now points at each package's reference page on docs.stetcms.com rather
  than at a GitHub copy of the README the reader is already looking at, and the
  cross-links between packages follow it there.

  `@stetcms/analytics`, `@stetcms/client` and `@stetcms/config` declare
  `sideEffects: false`, so bundlers can drop unused exports from consumer builds.
  `@stetcms/client` declares `engines.node >= 20`, which the other four already did.

- Updated dependencies [01cabe9]
  - @stetcms/config@0.1.1

## 0.1.0

### Minor Changes

- b2bc001: Product analytics: pageviews and typed custom events, routed through your own backend.

  `@stetcms/analytics` is new. Declare a tracking plan with `defineAnalytics`, mount `createAnalyticsHandler` on one route in your app, and call `createAnalytics(...).track()` from the browser. Events never reach a third-party origin, so there is nothing for a blocker to match on and the reader's address never leaves your infrastructure. The handler derives country, browser, OS, device and a day-scoped visitor digest from the request, and reduces URLs to a pathname plus campaign parameters before anything is stored. No cookies, so no consent banner.

  `@stetcms/config` is new, and this is a breaking change to how projects are configured. `stet.config.ts` now describes the whole integration through `defineStet({ origin, apiKey, output, watch, analytics })`, and both `@stetcms/vite` and `@stetcms/cli` read it, so a plugin option and a CLI flag can no longer disagree. Plugin options and CLI flags still win over the file, which wins over the environment.

  `@stetcms/vite` publishes the tracking plan on dev-server and build start alongside the content codegen, and takes a `config` option pointing at the config file. `@stetcms/cli` gains `stet sync`, and `stet generate` reads the config file too.

- ccca43f: A field deleted from the content model now reaches the generated client as a deprecation instead of disappearing. The key stays in `stet.gen.ts` carrying a `/** @deprecated */` doc comment naming the day it was deleted and who deleted it, so your editor strikes it through wherever you read it, your build keeps passing while you migrate, and a key you meet months later can be traced to someone who can explain it. Previously the field vanished on the next regeneration, which — with the dev server's three-second watch — turned a deletion someone else made in the Stet UI into a type error moments later.
- b2bc001: The generated content client now reads `STET_ORIGIN` at runtime, falling back to the origin it was generated against, so it resolves its origin the same way it already resolved its API key.

  Previously the origin was baked in as a literal. Because codegen deliberately never fails a build — without a key it keeps the last generated file — a build in an environment with no `STET_API_KEY` could ship a client still pointed at whatever origin a developer last generated from, typically `http://localhost:3000`. The symptom was content silently failing to load rather than an error naming the cause.

  Behaviour change for anyone who both commits `stet.gen.ts` and sets `STET_ORIGIN` at runtime to something other than the origin they generated against: the environment now wins.

### Patch Changes

- Updated dependencies [b2bc001]
  - @stetcms/config@0.1.0
