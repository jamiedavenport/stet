# Stet + Next.js example

A minimal blog that exercises the path `stet generate` exists for: a project
that does not build with Vite, so [`@stetcms/vite`](../../published/vite) does
not apply. The CLI generates the typed client from the content model marketing
builds in the UI, and App Router server components load content through it.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/[slug]` renders one post's
  rich text body from the sanitised HTML returned by Stet.
- `stet.config.ts` configures the integration: where Stet is and where the
  generated client goes. `stet generate` reads it, so the build script and a
  by-hand run agree.
- `src/stet.gen.ts` is the generated client, committed so the example
  type-checks without a running server. `pnpm generate` refreshes it; the
  build runs `stet generate --if-key` first, which regenerates when
  `STET_API_KEY` is set and keeps the committed copy when it is not.
- `src/lib/stet.ts` is the only module that imports the generated client, and
  it starts with `import 'server-only'`. The API key never reaches the
  browser, and importing the client from a client component is a build error
  rather than a leak.

## Run it against a local Stet

1. Start Stet: `vp run dev` (from the repo root), then seed it:

   ```bash
   pnpm seed
   ```

   The seed creates exactly this app's model (the **Posts** collection and
   **Landing** map), ten posts with bodies, authors and cover images, a
   filled-in landing page, and a deterministic API key, so a reseed never
   breaks the example.

2. Build the CLI once (its `stet` binary runs from `dist`):

   ```bash
   vp run cli#build
   ```

3. Generate the client and run the example with the seeded key:

   ```bash
   cd examples/nextjs
   pnpm generate
   pnpm dev   # http://localhost:3002
   ```

4. Sign in at `http://localhost:3000` as `seed@example.com` /
   `seed-password-123` and edit content; every route renders on request, so a
   saved edit appears on the next refresh.

Any other organization works too: mint a key under Developers → API keys in the
Stet app, copy it while it is shown, and run
`stet generate --key stet_...` with it.

Rename a field in the Stet UI, run `pnpm generate` again, and stale field
access fails the type check instead of the page. Without a Vite dev server
there is no polling: regeneration happens when you, or your build, run the
CLI.

## The build is the point

```json
"build": "stet generate --if-key && next build"
```

In your own project, where CI has `STET_API_KEY`, plain
`stet generate && next build` is all you need: every build starts from the
current content model. `--if-key` makes the same script pass where no key
exists (such as this repository's CI), by keeping the committed
`src/stet.gen.ts` instead of failing.

## Point it somewhere else

`STET_ORIGIN` selects the Stet deployment the CLI generates from (and the
client calls at runtime): `STET_ORIGIN=https://stetcms.com pnpm generate`.
