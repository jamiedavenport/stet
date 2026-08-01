# Stet + SvelteKit example

A minimal blog that shows `@stetcms/vite` dropping into a SvelteKit app
unchanged: the Vite plugin generates a typed client from the content model
marketing builds in the UI, the app loads content through it, and its own
analytics route reports how that content performs.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/[slug]` renders one post's
  rich text body from the sanitised HTML returned by Stet.
- `stet.config.ts` configures the whole integration: where Stet is, where the
  generated client goes, and the analytics tracking plan.
- `src/lib/server/stet.gen.ts` is the generated client. `@stetcms/vite`
  regenerates it from `/api/v1/model` on every dev-server and build start; the
  committed copy matches the model below so the app type-checks without a
  running server. It lives under `$lib/server`, so content can only be loaded
  from `+page.server.ts` files and the API key never reaches the browser —
  SvelteKit fails the build if client code tries to import it.
- `src/routes/api/analytics/+server.ts` mounts the analytics handler, so
  events reach Stet through this app rather than from the browser.

## Run it against a local Stet

1. Start Stet: `vp run dev` (from the repo root), then seed it:

   ```bash
   pnpm seed
   ```

   The seed creates exactly this app's model (the **Posts** collection and
   **Landing** map with the fields above), ten posts with bodies, authors and
   cover images, a filled-in landing page, and a deterministic API key, so a
   reseed never breaks the example.

2. Run the example with the seeded key:

   ```bash
   cd examples/sveltekit
   STET_API_KEY=stet_seed_key_for_local_development_only pnpm dev   # http://localhost:3003
   ```

3. Sign in at `http://localhost:3000` as `seed@example.com` /
   `seed-password-123` and edit content; write a body in the entry editor
   and it appears on the blog a few seconds later.

Any other organization works too: mint a key under Developers → API keys in the
Stet app, copy it while it is shown, and pass it as `STET_API_KEY`.

Rename a field in the Stet UI and watch: the plugin polls the model while the
dev server runs, regenerates the client within a few seconds, and stale field
access fails the type check instead of the page.

## Analytics

Browsing the blog records pageviews, and opening a post records `post.read`
on top of one. Both go to `/api/analytics` in this app, which validates them
against the plan in `stet.config.ts`, adds what only a backend can see
(country, browser, a day-scoped visitor digest), and forwards them to Stet.
See them at `http://localhost:3000/app/analytics`.

The plan is published on every dev-server and build start, so an event
appears in Stet before anyone fires it: `post.finished` is declared here and
tracked nowhere, and it is still offered in the dashboard.

Try breaking it. Track an event that is not in the plan, or pass a prop the
wrong type, and the type check fails before the browser is involved:

```ts
analytics.track('post.read'); // missing slug
analytics.track('post.reed', { slug }); // no such event
```

## Point it somewhere else

`STET_ORIGIN` selects the Stet deployment the plugin generates from (and the
client calls at runtime): `STET_ORIGIN=https://stetcms.com pnpm dev`.
