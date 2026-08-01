# Stet + Nuxt example

The same minimal blog as [examples/tanstack](../tanstack), on Nuxt. Nuxt builds
on Vite, so the integration is the same `@stetcms/vite` plugin, registered
through `vite.plugins` in `nuxt.config.ts`.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/[slug]` renders one post's
  rich text body from the sanitised HTML returned by Stet.
- `stet.config.ts` configures the whole integration: where Stet is, where the
  generated client goes, and the analytics tracking plan.
- `server/stet.gen.ts` is the generated client. `@stetcms/vite` regenerates it
  from `/api/v1/model` on every dev-server and build start; the committed
  copy matches the model below so the app type-checks without a running
  server. It lives under `server/` because only server routes may import it:
  pages fetch through `/api/*`, so the API key never reaches the browser.
- `server/api/analytics.post.ts` mounts the analytics handler, so events reach
  Stet through this app rather than from the browser.

## What Nuxt changes

The plugin works unchanged, with one wrinkle: Nuxt points Vite's root at
`app/`, so the plugin's auto-detection would look for `stet.config.ts` in the
wrong directory. `nuxt.config.ts` passes the `config` and `output` paths
explicitly instead. Nuxt also runs separate Vite builds for client and server,
so the plugin regenerates the client (and publishes the tracking plan) once
per build; the second pass writes the same file and is harmless.

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
   cd examples/nuxt
   STET_API_KEY=stet_seed_key_for_local_development_only pnpm dev   # http://localhost:3002
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
wrong type, and the build fails before the browser is involved:

```ts
analytics.track('post.read'); // missing slug
analytics.track('post.reed', { slug }); // no such event
```

## Point it somewhere else

`STET_ORIGIN` selects the Stet deployment the plugin generates from (and the
client calls at runtime): `STET_ORIGIN=https://stetcms.com pnpm dev`.
