# @repo/web

The primary web application: a TanStack Start (React) app served by the `stet-web` Cloudflare Worker. This is where the shared packages meet.

- `src/server.ts`: Worker entry. Exports the fetch handler plus the `scheduled` (crons) and `queue` (jobs) handlers, the Durable Object classes, and the workflow classes.
- `src/routes/`: file-based routing. The public marketing site (`_marketing/*`) owns `/`; the signed-in product lives under `/app`. The root route resolves the session for every route, including marketing (a Better Auth cookie-cache read, not a database query); `/app` additionally fetches the user's organizations via `ensureOrganizations` plus the caller's role in the active one, and heals a session whose active organization is gone. `/api/auth/*` serves Better Auth (including the Stripe webhook), `/api/v1` implements the `@repo/api` contract, `/api/files/$id` takes uploads and serves private ones back to people who may read them, and `/assets/$id` serves content assets to anyone holding the URL, which is what lets a customer's own pages render them (see `src/files`). `/app/billing` is the organization's plan page.
- `src/session.ts`: the server-function middlewares. `organizationMiddleware` verifies the caller's member row on every call (the session cookie cache can outlive a removal) and exposes `organizationId` and `role`; `organizationAdminMiddleware` narrows to owners and admins, and gates the webhooks surface. The socket handlers in `src/server.ts` re-check membership the same way.
- `content/` + `content-collections.ts`: marketing content (blog posts, changelog releases) validated with Zod and compiled to HTML strings at build time with Shiki, so the Worker never evaluates code at runtime. Generated output lands in `.content-collections/` on install and build.
- `wrangler.jsonc`: bindings (D1, R2, Images, queues, Durable Objects, rate limits) and secrets. Cron and workflow config is generated at build time from the `@repo/crons` and `@repo/workflows` registries in `vite.config.ts`.
- `src/security.ts`: security headers on every worker response (HSTS, `nosniff`, and for HTML: report-only CSP, framing, referrer, permissions) plus the rate limiters. Credential endpoints are throttled per IP+path (`AUTH_RATE_LIMIT`); `/api/v1` per API key (`API_RATE_LIMIT`). Auth forms optionally render a Turnstile widget (`TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`).
- `src/policystack.ts`: the [PolicyStack](https://www.policystack.dev) config. One `defineConfig()` drives the privacy policy (`/privacy`), the cookie policy (`/cookies`), and the consent runtime: the banner in `src/legal/`, and the analytics gate in `src/components/analytics.tsx` (OpenPanel boots only after the analytics category is granted). The `policyStack()` Vite plugin scans `src` into `src/policystack.gen.ts` (committed) and validates the config on every build; accepted gaps are suppressed in `vite.config.ts`. Have a lawyer review the rendered output before launch.

## Marketing site

`/` is the landing page; `/blog`, `/changelog`, and `/contact` render from the `_marketing` layout in the jxd.dev visual language (Inter, Mona Sans, Geist Mono, self-hosted via Fontsource). `rss.xml`, `sitemap.xml`, `robots.txt`, and `llms.txt` are server routes over the same content.

- **Add a post**: create `content/posts/<slug>.md` with `title`, `summary`, and `date` frontmatter (plus optional `tags`, `author`). Its OG share image is generated on the next install or build; add an entry to `og/config.ts` if the route is new.
- **Add a changelog entry**: create `content/releases/<date>-<slug>.md` with `title`, `date`, and optional `tags`.
- **Change the pitch**: the components and copy live in `@repo/ui/marketing` (`data.ts` holds the landing copy) and the identity in `@repo/brand`; this app only wires routes to them, with collection access in `src/marketing/content.ts`. Keep the pitch aligned with the root README.
- **OG share images**: `og/generate.ts` renders them into `public/og/` (gitignored) on install and build, keyed by route path in `og/config.ts` with the design in `og/template.tsx`. Rendering happens in Node (satori + resvg), so the Worker ships no rendering code and serves the images as static assets.

## Commands

| Command           | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev`        | Dev server on http://localhost:3000, simulating all bindings |
| `pnpm build`      | Content build, typecheck, and production build               |
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
