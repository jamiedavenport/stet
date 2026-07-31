# Contributing

Issues and pull requests are welcome. This file covers getting the repository
running, the checks CI enforces, and the conventions. Participation is governed
by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Prerequisites

- Node.js >= 22.18
- [Vite+](https://vite.dev) (`vp`), which drives pnpm 11 workspaces

## Setup

```bash
vp install
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm seed
vp run dev   # apps/web on http://localhost:3000
```

That is the whole thing. Sign in as `seed@example.com` with the password in
[internal/db/src/seed-data.ts](internal/db/src/seed-data.ts).

The defaults in `.dev.vars.example` run the whole app locally with no external accounts, and CI copies it verbatim. It documents each value inline: notably the blank `OPENPANEL_CLIENT_ID` that keeps local traffic out of the real analytics project (see [internal/openpanel](internal/openpanel)), Cloudflare's always-pass Turnstile test pair, and the commented-out optional keys for Resend, Anthropic, Stripe (see [internal/billing](internal/billing) for the Stripe CLI sandbox setup), and social sign-in.

Add a new local secret by adding it to `.dev.vars.example` (commented out if optional) so contributors and CI stay in sync.

`pnpm seed` creates the local sqlite database miniflare uses, pushes the schema
into it, and fills it with accounts and a workspace to look at (see
[internal/seed](internal/seed)). Re-run it whenever you want that state back.
To push a schema change without reseeding, `cd internal/db && pnpm push`.

If the local database ever drifts far enough that a push cannot reconcile it,
delete it and start again:

```bash
rm -rf apps/web/.wrangler/state
pnpm seed
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

## Proposing a change

- **Bugs and small fixes**: open a pull request directly. An issue first is
  welcome but not required.
- **Anything that changes a shape** (the content model, the public API, a
  `published/*` package's surface, a UI flow): open an issue describing the
  problem before writing the code, so the design conversation happens before
  the work does.
- **Questions**: open an issue. There is no separate forum yet.
- **Security**: email [hello@jxd.dev](mailto:hello@jxd.dev) rather than opening
  an issue. See [SECURITY.md](SECURITY.md).

Stet is pre-launch, with no users and no installed base, so breaking changes
are fine. State them in the pull request body rather than adding redirects,
shims or aliases to avoid them.

## Conventions

- Use Conventional Commit messages.
- Test features with Vitest or Playwright.
- File an issue for known bugs and future work.
- Write user-facing copy as plain English strings in the components; the app is English-only.
- Documentation goes where it belongs: a package README is the reference for
  that package, `apps/docs` is the product documentation. Link across rather
  than restating.

## Releases

`published/*` packages are versioned with [Changesets](https://github.com/changesets/changesets):

1. Describe each user-facing change with `pnpm changeset`.
2. On pushes to `main`, `.github/workflows/release.yml` maintains a "Version Packages" PR.
3. Merging that PR builds with `vp pack` and publishes to npm (requires the `NPM_TOKEN` repository secret).
