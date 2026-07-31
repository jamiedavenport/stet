# @repo/web

The primary web application: a TanStack Start (React) app served by the `stet-web` Cloudflare Worker. This is where the shared packages meet.

- `src/server.ts`: Worker entry. Exports the fetch handler plus the `scheduled` (crons) and `queue` (jobs) handlers, the Durable Object classes, and the workflow classes.
- `src/routes/`: file-based routing. The public marketing site (`_marketing/*`) owns `/`; the signed-in product lives under `/app`. The root route resolves the session for every route, including marketing (a Better Auth cookie-cache read, not a database query); `/app` additionally fetches the user's organizations via `ensureOrganizations` plus the caller's role in the active one, and heals a session whose active organization is gone. `/api/auth/*` serves Better Auth (including the Stripe webhook), `/api/v1` implements the `@repo/api` contract, `/api/files/$id` takes uploads and serves private ones back to people who may read them, and `/assets/$id` serves content assets to anyone holding the URL, which is what lets a customer's own pages render them (see `src/files`). `/app/billing` is the organization's plan page.
- `src/session.ts`: the server-function middlewares. `organizationMiddleware` verifies the caller's member row on every call (the session cookie cache can outlive a removal) and exposes `organizationId` and `role`; `organizationAdminMiddleware` narrows to owners and admins, and gates the webhooks surface. The socket handlers in `src/server.ts` re-check membership the same way.
- `src/stet.gen.ts` + `src/marketing/posts.ts`: the blog, which this app reads out of Stet through [`@stetcms/client`](../../published/client) exactly as a customer would, including the sanitised HTML returned for each rich text body. `src/stet.config.ts` configures both jobs of the [`@stetcms/vite`](../../published/vite) plugin: generating that client from the live content model, and publishing the tracking plan (see [dogfooding/analytics](../../dogfooding/analytics)).
- `wrangler.jsonc`: bindings (D1, R2, Images, queues, Durable Objects, rate limits) and secrets. Cron and workflow config is generated at build time from the `@repo/crons` and `@repo/workflows` registries in `vite.config.ts`.
- `src/canonical-host.ts`: strips a `www.` prefix off the request host and redirects, so one origin serves the app and the sessions issued for it. Runs ahead of every other handler in `src/server.ts`; the hostname needs its own `custom_domain` route in `wrangler.jsonc` to reach the worker at all.
- `src/security.ts`: security headers on every worker response (HSTS, `nosniff`, and for HTML: report-only CSP, framing, referrer, permissions) plus the rate limiters. Credential endpoints are throttled per IP+path (`AUTH_RATE_LIMIT`); `/api/v1` per API key (`API_RATE_LIMIT`). Auth forms optionally render a Turnstile widget (`TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`).
- `src/policystack.ts`: the [PolicyStack](https://www.policystack.dev) config. One `defineConfig()` drives the privacy policy (`/privacy`), the cookie policy (`/cookies`), and the consent runtime and the banner in `src/legal/`. Product analytics are first-party and cookieless (see [dogfooding/analytics](../../dogfooding/analytics)), so they store nothing on the reader's device and sit behind no consent category. The `policyStack()` Vite plugin scans `src` into `src/policystack.gen.ts` (committed) and validates the config on every build; accepted gaps are suppressed in `vite.config.ts`. `/privacy` and `/cookies` render from this config and are already served: have a lawyer review the rendered output, and read it again after any change to what the app collects.

## Marketing site

`/` is the landing page; `/blog` and `/contact` render from the `_marketing` layout in the jxd.dev visual language (Inter, Mona Sans, Geist Mono, self-hosted via Fontsource). `rss.xml`, `sitemap.xml`, `robots.txt`, and `llms.txt` are server routes over the same content.

- **Add a post**: write it in Stet, in the Posts collection of the organization the key belongs to. It is live on the next request; nothing is deployed and nothing is committed. `src/marketing/posts.ts` orders entries and supplies metadata fallbacks, and `src/marketing/content.ts` wraps reads in server functions so the key never reaches the browser. OG share images are the exception, being rendered at build time, so a new post gets its card on the next build.
- **See posts locally**: `STET_API_KEY` has to bind, which means adding it to `secrets.required` in your working copy as well as to `.dev.vars` (see `.dev.vars.example`). Without it the blog is simply empty, which is what CI runs.
- **Change the pitch**: the copy lives in `src/marketing/data/` (features, personas, pricing, and the comparison tables), the shared layout components in `@repo/ui/marketing`, and the identity in `@repo/brand`. Keep the pitch aligned with the root README, which is the accurate statement of what exists.
- **OG share images**: `og/generate.ts` renders them into `public/og/` (gitignored) on install and build, keyed by route path in `og/config.ts` with the design in `og/template.tsx`. Rendering happens in Node (satori + resvg), so the Worker ships no rendering code and serves the images as static assets.

## Commands

| Command           | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev`        | Dev server on http://localhost:3000, simulating all bindings |
| `pnpm build`      | OG images, typecheck, and production build                   |
| `pnpm run deploy` | Build and `wrangler deploy`                                  |
| `pnpm test:e2e`   | Playwright end-to-end tests                                  |
| `pnpm cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |
| `pnpm analyze`    | Bundle report (Sonda)                                        |
| `pnpm size`       | Bundle size budgets (also enforced in CI)                    |

Local secrets go in `.dev.vars` (see [CONTRIBUTING.md](../../CONTRIBUTING.md)). Production setup is covered in [DEPLOY.md](../../DEPLOY.md).

## Upstream workarounds

`vite.config.ts` carries fixes for bugs that belong to our dependencies. Each one should be deleted when its upstream lands.

### The ssr dep scan (`environments.ssr.optimizeDeps`)

Symptom: the dev server dies within minutes, repeating `The file does not exist at ".../deps_ssr/<chunk>.js" which is in the optimize deps directory`, then exiting on a `SyntaxError` from `JSON.parse`.

Cause: `@tsrx/vite-plugin-react` registers its `.tsrx` dep scan through the `config()` hook, which Vite applies to the client environment only. The ssr scanner therefore externalizes every component and never crawls what they import, so those deps are discovered at request time instead. Each discovery re-optimizes `deps_ssr`, and re-optimizing renames shared chunks by content hash and deletes the old files while workerd still holds the old names. Adding one dep renamed four unrelated chunks in testing.

Fix: rebuild TSRX's scan config against the ssr environment, which is why `@tsrx/core` is a direct dependency here despite nothing importing it at runtime. Both keys are one unit: `extensions` makes the scanner read `.tsrx`, the scan plugin makes it parse. Setting `extensions` alone is worse than neither, because the scanner then parses components as plain JS, fails, and skips pre-bundling for the whole project.

Upstream: `@tsrx/vite-plugin-react` should move that block from `config()` to `configEnvironment()`. `@tanstack/react-start` already does exactly this in `dist/esm/plugin/vite.js` and is the model to point at.

### `@tsrx/core` dep-scan types (`tsrx-core.d.ts`)

A second, smaller bug in the same package. The `./vite/dep-scan` subpath maps its `types` condition at `src/vite/dep-scan.js`, so under `moduleResolution: bundler` TypeScript cannot read it and the import is `any` (TS7016). The real declarations ship at `types/vite/dep-scan.d.ts`, exposed only under the separate `./types/vite/dep-scan` subpath. `tsrx-core.d.ts` bridges the two for the one factory we call.

Upstream: point the `types` condition at the `.d.ts` the package already publishes.

Verify a change to this block by clearing `node_modules/.vite`, starting the dev server, recording `deps_ssr/_metadata.json`, then requesting every marketing route. The entry count and the `hash` must both be unchanged, and the log must contain no `optimized dependencies changed` line.

### Two amplifiers, not worked around here

- `@cloudflare/vite-plugin`'s `__VITE_INVOKE_MODULE__` handler awaits `request.json()` with no error handling, so any malformed loopback reply becomes an unhandled rejection and Node exits. This is what turns a recoverable dep error into a dead dev server.
- Vite's optimizer deletes superseded chunk files immediately. The browser survives this via `browserHash` and a forced reload; the ssr runtime has no equivalent grace period.
