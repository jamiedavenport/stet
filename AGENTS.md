# Stet

A CMS where marketing owns the content model and engineering gets a generated
typed contract for it. Cloudflare Workers + D1 + Drizzle + TanStack Start.

| Path          | What it holds                                      |
| ------------- | -------------------------------------------------- |
| `apps/web`    | App and marketing site, one Worker                 |
| `apps/docs`   | Documentation site                                 |
| `published/`  | npm packages: client, Vite plugin, analytics, CLI  |
| `internal/`   | Workspace packages, not published                  |
| `dogfooding/` | Stet running on Stet                               |
| `examples/`   | TanStack Start blog consuming the generated client |

Each package has its own README with its exports, bindings and commands.
Setup and CI: CONTRIBUTING.md. Deploying: DEPLOY.md.

# Commands

The runner is `vp` (Vite+). Never call `pnpm` or `npm` directly.
Everything goes through `vp run <task>`, optionally scoped as
`vp run <package>#<task>`.

- `vp run -r tc` — type check everything. Run after a series of edits.
- `vp run -r test` — Vitest.
- `vp run ready` — everything CI runs. **Run before reporting work done.**
- `vp run web#test:e2e` — Playwright. Needs port 3000 free; use `--workers=1`.
- `vp run web#cf-typegen` — after editing `wrangler.jsonc`.
- `vp run @repo/db#push` — after a schema change.
- `vp run seed` — reset local data.

Apps are named bare (`web`, `docs`); `internal/*` keeps the `@repo/` scope
because those are imported by name.

`worker-configuration.d.ts` is generated and gitignored, so a fresh clone fails
`tc` with missing `cloudflare:workers` types until you run `cf-typegen` once.
Renaming a workspace package needs `vp install` before its tasks resolve.

Report the output, not a summary of it. If a check fails, say so.

# Pre-launch

No users, no installed base, no backwards compatibility to keep. Don't add
redirects for moved routes, deprecation shims, migration paths, or aliases kept
"just in case" — pick the shape the code should have and change it everywhere.
Note the break in the commit or PR body.

The repo is public. Marketing copy and docs must not claim past what is built;
README.md is the accurate statement, including its "Not built yet" section.
Don't write tests asserting on that wording.

# Conventions

- Conventional Commits. File an issue for known bugs and future work.
- Components use TSRX.
- Test critical paths only: auth, content read/write, sync, billing webhooks.
  Not styling, copy, or config plumbing.
- `type`, not `interface`. No shorthand conditionals. Files under ~200 lines.
- JSDoc on exports.
- Never `console.log`. Background work follows the wide-event convention in
  `internal/logging/README.md`: one event per queue message, cron run, or
  webhook event, emitted once in a `finally`.
- Let errors propagate; the Worker's Sentry wrapper reports them.
  `ExpectedFailure` and the swallow-and-capture exception are in that README.

<!-- TODO: add the TSRX gotchas (root element, escape hatch) once verified -->

# Comments

Write one only when the reason is non-obvious and the code can't show it itself
— a gotcha, a workaround for external behaviour, a subtle constraint.
Otherwise, none. Explain why, never restate the code. One line is the default;
longer rationale belongs in the commit message. Don't justify the approach or
narrate the alternative you didn't pick.

# Documentation

A package README is the reference for that package. `apps/docs` is the product
documentation: what a feature does and how to build on it. Restating one in the
other is what lets them drift — link across instead.
