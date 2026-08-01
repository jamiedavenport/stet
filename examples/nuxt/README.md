# Stet + Nuxt example

The same minimal blog as [examples/tanstack](../tanstack), on Nuxt. Nuxt builds
on Vite, so the integration is the same `@stetcms/vite` plugin, registered
through `vite.plugins` in `nuxt.config.ts`. This example covers content only;
see the TanStack example for the analytics integration.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/[slug]` renders one post's
  rich text body from the sanitised HTML returned by Stet.
- `stet.config.ts` configures the integration: where Stet is and where the
  generated client goes.
- `server/stet.gen.ts` is the generated client. `@stetcms/vite` regenerates it
  from `/api/v1/model` on every dev-server and build start; the committed
  copy matches the model below so the app type-checks without a running
  server. It lives under `server/` because only server routes may import it:
  pages fetch through `/api/*`, so the API key never reaches the browser.
- Nitro prerendering starts at `/` and `/blog`, then crawls every linked post
  when `STET_API_KEY` is present.

## What Nuxt changes

The plugin works unchanged, with one wrinkle: Nuxt points Vite's root at
`app/`, so the plugin's auto-detection would look for `stet.config.ts` in the
wrong directory. `nuxt.config.ts` passes the `config` and `output` paths
explicitly instead. Nuxt also runs separate Vite builds for client and server,
so the plugin regenerates the client once per build; the second pass writes
the same file and is harmless.

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

## Prerendering

Run `vp run build` with `STET_API_KEY` to make Nitro prerender the landing
page, blog, and every post it discovers. A configured content request that
fails also fails the build. Without a key, Nitro leaves those routes dynamic.

## Point it somewhere else

`STET_ORIGIN` selects the Stet deployment the plugin generates from (and the
client calls at runtime): `STET_ORIGIN=https://stetcms.com pnpm dev`.
