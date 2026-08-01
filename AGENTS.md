# Stet

Stet is a CMS that gives marketing control of the content model and generates a
typed contract for engineering. It runs on Cloudflare Workers with D1, Drizzle,
TanStack Start, and TypeScript.

## Repository map

- `apps/web`: product app and marketing site in one Worker.
- `apps/docs`: product documentation.
- `published`: public npm packages.
- `internal`: private workspace packages.

Read the nearest package README before changing a package. Use `CONTRIBUTING.md`
for setup and CI details and `DEPLOY.md` for deployment and operations.

## Commands

Vite+ (`vp`) is the primary runner. Use `vp install` for dependencies,
`vp run <task>` for root scripts, and `vp run <package>#<task>` for one package.

- `vp run ready`: formatting, linting, dead-code checks, type checks, and builds.
- `vp run -r test`: all Vitest suites.
- `vp run web#test:e2e`: Playwright end-to-end tests.
- `vp run web#cf-typegen`: regenerate Worker types after changing
  `apps/web/wrangler.jsonc`.
- `vp run @repo/db#push`: apply schema changes to the local database.
- `vp run seed`: reset and seed local data.

Run focused checks while iterating. Before reporting completion, run
`vp run ready` and the relevant test suites. State any checks that failed or
were not run.

`apps/web/worker-configuration.d.ts` is generated and gitignored. Generate it
before type checking a fresh clone. Do not hand-edit generated files such as
`*.gen.ts` or `worker-configuration.d.ts`.

## Engineering conventions

- Use Conventional Commits.
- Prefer `type` over `interface` in handwritten TypeScript. Use `interface`
  where declaration merging requires it.
- Avoid shorthand conditionals. Prefer files under 200 lines where practical.
- Use TSRX for render-oriented React components. Use TSX where composition or
  third-party APIs require JSX values, render props, or nested elements.
- Add focused tests for behavior changes. Do not test marketing wording or
  styling alone.
- Comments explain non-obvious constraints or workarounds, not what the code
  already says.
- For background logging and error handling, follow
  `internal/logging/README.md`. Do not use `console.log`.

## Pre-launch changes

There are no users or installed base to preserve. Make breaking changes
consistently across the repository instead of adding redirects, aliases,
deprecation shims, or speculative migration paths. Call out breaking changes in
the commit or pull request.

The repository is public. Product and marketing claims must match what is
implemented; `README.md` and its "Not built yet" section are authoritative.

## Documentation

Package READMEs own package APIs, bindings, and development details.
`apps/docs` owns product behavior and integration guidance. Link between them
instead of duplicating content.
