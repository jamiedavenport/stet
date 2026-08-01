# Stet + SvelteKit example

A minimal blog that shows `@stetcms/vite` dropping into a SvelteKit app
unchanged: the Vite plugin generates a typed client from the content model
marketing builds in the UI, and the app loads content through it.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/[slug]` renders one post's
  rich text body from the sanitised HTML returned by Stet.
- `stet.config.ts` configures the integration: where Stet is and where the
  generated client goes.
- `src/lib/server/stet.gen.ts` is the generated client. `@stetcms/vite`
  regenerates it from `/api/v1/model` on every dev-server and build start; the
  committed copy matches the model below so the app type-checks without a
  running server. It lives under `$lib/server`, so content can only be loaded
  from `+page.server.ts` files and the API key never reaches the browser —
  SvelteKit fails the build if client code tries to import it.
- The server layout enables prerendering when a key exists, and the dynamic
  route's `entries` function returns every post slug.

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
dev server runs and regenerates the client within a few seconds. The retired
key stays as a `@deprecated` alias that still returns the value, so stale
reads are struck through in your editor rather than breaking the page, and
the type check fails only once the migration is completed in Stet.

## Prerendering

Run `vp run build` with `STET_API_KEY` to prerender the landing page, blog,
and every post. A configured content request that fails also fails the build.
Without a key, the example keeps its request-rendered fallback.

## Point it somewhere else

`STET_ORIGIN` selects the Stet deployment the plugin generates from (and the
client calls at runtime): `STET_ORIGIN=https://stetcms.com pnpm dev`.
