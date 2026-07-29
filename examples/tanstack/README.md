# Stet + TanStack Start example

A minimal blog that dogfoods the developer side of Stet: the Vite plugin
generates a typed client from the content model marketing builds in the UI,
and the app loads content through it.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/$slug` renders one post's
  rich text body as markdown.
- `src/stet.gen.ts` is the generated client. `@stetcms/vite` regenerates it
  from `/api/v1/model` on every dev-server and build start; the committed
  copy matches the model below so the app type-checks without a running
  server.

## Run it against a local Stet

1. Start Stet: `vp run dev` (from the repo root), then seed it:

   ```bash
   pnpm --filter @repo/db seed
   ```

   The seed creates exactly this app's model (the **Posts** collection and
   **Landing** map with the fields above), two posts, and a deterministic
   API key, so a reseed never breaks the example.

2. Run the example with the seeded key:

   ```bash
   cd examples/tanstack
   STET_API_KEY=stet_seed_key_for_local_development_only pnpm dev   # http://localhost:3001
   ```

3. Sign in at `http://localhost:3000` as `seed@example.com` /
   `seed-password-123` and edit content; write a body in the entry editor
   and it appears on the blog as markdown a few seconds later.

Any other organization works too: mint a key with
`POST /api/auth/api-key/create` (body `{"name":"example","organizationId":"…"}`,
authenticated with your session) and pass it as `STET_API_KEY`.

Rename a field in the Stet UI and watch: the plugin polls the model while the
dev server runs, regenerates the client within a few seconds, and stale field
access fails the type check instead of the page.

## Point it somewhere else

`STET_ORIGIN` selects the Stet deployment the plugin generates from (and the
client calls at runtime): `STET_ORIGIN=https://stetcms.com pnpm dev`.
