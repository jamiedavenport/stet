# Stet + Astro example

A minimal blog that shows Stet needs nothing Astro-specific: Astro builds on
Vite, so `@stetcms/vite` goes straight into `vite.plugins` in
`astro.config.ts` and both of its jobs — generating the typed content client
and publishing the tracking plan — run unchanged.

- `/` renders the **Landing** map.
- `/blog` lists the **Posts** collection; `/blog/[slug]` renders one post's
  rich text body from the sanitised HTML returned by Stet.
- `stet.config.ts` configures the whole integration: where Stet is, where the
  generated client goes, and the analytics tracking plan.
- `src/stet.gen.ts` is the generated client. `@stetcms/vite` regenerates it
  from `/api/v1/model` on every dev-server and build start; the committed
  copy matches the model below so the app type-checks without a running
  server.
- `src/pages/api/analytics.ts` mounts the analytics handler, so events reach
  Stet through this app rather than from the browser.

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
dev server runs, regenerates the client within a few seconds, and stale field
access fails the type check instead of the page.

## Analytics

Browsing the blog records pageviews, and opening a post records `post.read`
on top of one. Both go to `/api/analytics` in this app, which validates them
against the plan in `stet.config.ts`, adds what only a backend can see
(country, browser, a day-scoped visitor digest), and forwards them to Stet.
See them at `http://localhost:3000/app/analytics`.

Every navigation here is a real page load, so the client's automatic
pageviews stay on; a router would need to report navigations itself, which is
what the TanStack example does.

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
