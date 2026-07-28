# Contributing

## Prerequisites

- Node.js >= 22.18
- [Vite+](https://vite.dev) (`vp`), which drives pnpm 11 workspaces

## Setup

```bash
vp install
vp run dev   # apps/web on http://localhost:3000
```

Create `apps/web/.dev.vars` for local secrets:

```bash
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

The defaults in that file run the whole app locally with no external accounts, and CI copies it verbatim. It documents each value inline: notably the blank `OPENPANEL_CLIENT_ID` that keeps local traffic out of the real analytics project (see [private/analytics](private/analytics)), Cloudflare's always-pass Turnstile test pair, and the commented-out optional keys for Resend, Anthropic, Stripe (see [private/billing](private/billing) for the Stripe CLI sandbox setup), and social sign-in.

Add a new local secret by adding it to `.dev.vars.example` (commented out if optional) so contributors and CI stay in sync.

Push the schema into the local sqlite database created by `vp dev`:

```bash
cd private/db && pnpm push
```

## Checks

```bash
vp run ready   # vp check + build every package, same as CI
```

Targeted commands:

```bash
vp dev apps/web                 # run one package
vp run -r build                 # build everything
vp run -r tc                    # type check everything
vp run -r test                  # Vitest unit tests
cd apps/web && pnpm test:e2e    # Playwright end-to-end tests
cd apps/web && pnpm cf-typegen  # regenerate types after editing wrangler.jsonc
```

CI (`.github/workflows/ci.yml`) runs typegen, `vp check`, a recursive type check, a full build, unit tests, bundle size budgets, and the Playwright suite on every push and pull request. On pushes to `main` it then deploys both Workers (see [DEPLOY.md](DEPLOY.md)).

## Conventions

- Use Conventional Commit messages.
- Test features with Vitest or Playwright.
- File an issue for known bugs and future work.
- Write user-facing copy as Paraglide messages: add the key to `private/i18n/messages/en/{web,marketing,mail,common}.json`, fill the `es`/`fr` equivalents, and call `m.your_key()` from `@repo/i18n/messages`. See [private/i18n](private/i18n).

## Releases

`published/*` packages are versioned with [Changesets](https://github.com/changesets/changesets):

1. Describe each user-facing change with `pnpm changeset`.
2. On pushes to `main`, `.github/workflows/release.yml` maintains a "Version Packages" PR.
3. Merging that PR builds with `vp pack` and publishes to npm (requires the `NPM_TOKEN` repository secret).
