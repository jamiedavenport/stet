@README.md
@CONTRIBUTING.md
@DEPLOY.md

Each app and package has its own README with the details for that area.

# Stet is pre-launch

Stet grew out of the Onyx starter kit: the platform plumbing (auth, organizations, billing, jobs, realtime, webhooks) is inherited and solid; the product in the README is being prototyped on top of it. There are no users and no installed base yet.

So there is no backwards compatibility to keep. Don't add redirects for moved routes, deprecation shims, migration paths, or aliases kept "just in case" — pick the shape the code should have and change it everywhere. Note the breaking change in the commit or PR body and move on. (Deprecation-over-breakage is Stet's promise to its future customers, not a constraint on this repo today.)

Marketing copy and docs describe the product Stet is becoming; keep them aligned with README.md and don't write tests that assert on their wording.

# Git

- Use Conventional Commits.
- Create issues for known bugs and future work.

# React

- Use TSRX for components.

# Testing

- For now only test critical features as to keep the codebase lean.

# Logging

- Background work produces one wide event per entry point: one per queue message, cron run, or webhook event. Create it there with `createLogger` from `@repo/logging` and `emit()` it once in a `finally`, so failures are recorded too.
- Pass that logger down to the work. Deeper functions add to the event they are given with `set()`, and record steps with `info()` and `warn()`, which fold into it rather than printing. Starting a second event splits one story across several lines, which is what wide events exist to avoid.
- Set fields from the `StetEvent` vocabulary. Needing a new one means extending that type, not inventing a key at the call site.
- Never `console.log`. For something genuinely unattached to a unit of work, evlog's `log` writes a standalone tagged line.
- Don't log HTTP requests. Cloudflare's invocation logs already cover them.

# Errors

- Let errors propagate. The worker's Sentry wrapper reports anything uncaught from a request, cron, or queue batch.
- Only call `Sentry.captureException` where the error is deliberately swallowed and would otherwise vanish.
- Throw `ExpectedFailure` from `@repo/logging` when an exception only exists to request a retry and means nothing is wrong with our code, such as a customer's endpoint being down. It is logged but kept out of Sentry. Anything meaning "someone should look at this" stays a plain `Error`.

# Documentation

Each surface owns different material, so nothing is written twice:

- A package README is the working reference for that package: what it exports, its wrangler bindings and secrets, and the commands to develop and test it.
- `apps/docs` is the product documentation: what a feature does, how it fits together, and how to build on it.
- Restating one in the other is what lets them drift. Link across instead.
- Write JSDoc comments for exports.

# Comments

- Write a comment only when the reason is non-obvious and the code can't be made to show it itself — a gotcha, a workaround for external behaviour, a subtle constraint. Otherwise, no comment.
- Explain why, not what. Never restate the code, a type, or a name in prose.
- One line is the default. If the rationale needs a paragraph, it belongs in the commit message or PR, not the source.
- Don't justify the approach or narrate the alternative you didn't pick.
