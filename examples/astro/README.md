# Stet + Astro example

A minimal blog that shows Stet needs nothing Astro-specific: Astro builds on
Vite, so `@stetcms/vite` goes straight into `vite.plugins` in
`astro.config.ts` and generates the typed content client unchanged.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/[slug]` renders one post's
  rich text body from the sanitised HTML returned by Stet.
- `stet.config.ts` configures the integration: where Stet is and where the
  generated client goes.
- `src/stet.gen.ts` is the generated client. `@stetcms/vite` regenerates it
  from `/api/v1/model` on every dev-server and build start; the committed
  copy matches the model below so the app type-checks without a running
  server.

Pages read content in frontmatter, which runs on the server: with
`output: 'server'` every page renders on demand, so the organization API key
stays out of the browser and an edit in Stet shows up on the next refresh.

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
   cd examples/astro
   STET_API_KEY=stet_seed_key_for_local_development_only pnpm dev   # http://localhost:3004
   ```

3. Sign in at `http://localhost:3000` as `seed@example.com` /
   `seed-password-123` and edit content; write a body in the entry editor,
   refresh the blog, and it is there.

Any other organization works too: mint a key under Developers → API keys in the
Stet app, copy it while it is shown, and pass it as `STET_API_KEY`.

Rename a field in the Stet UI and watch: the plugin polls the model while the
dev server runs and regenerates the client within a few seconds. The retired
key stays as a `@deprecated` alias that still returns the value, so stale
reads are struck through in your editor rather than breaking the page, and
the type check fails only once the migration is completed in Stet.

## Point it somewhere else

`STET_ORIGIN` selects the Stet deployment the plugin generates from (and the
client calls at runtime): `STET_ORIGIN=https://stetcms.com pnpm dev`.
