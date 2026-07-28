# Deploying

The whole app deploys as one Cloudflare Worker, `onyx-web`, configured in `apps/web/wrangler.jsonc`. The docs site deploys as a second Worker, `onyx-docs`, which has no bindings or secrets of its own.

## One-time setup

Create the resources the Worker binds to:

```bash
wrangler d1 create onyx-db              # put the database_id in wrangler.jsonc
wrangler r2 bucket create onyx-storage
wrangler queues create onyx-jobs
wrangler queues create onyx-jobs-dlq
```

The `IMAGES` binding, which `/api/files/$id` uses to resize and re-encode
uploads, needs nothing created. Transformations are billed per unique
transformation above a monthly free allowance, so check the Images pricing
before pointing a busy gallery at it; the route falls back to the stored
bytes whenever a transform fails.

Set the required secrets:

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put OPENPANEL_CLIENT_SECRET
```

Social sign-in is optional. To enable it, create OAuth apps and set the matching secrets (leave a pair unset to hide that button):

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

Set each provider's authorized callback URL to `https://<your-origin>/api/auth/callback/<google|github>`.

Bot protection on the auth forms is optional too. Create a [Turnstile widget](https://dash.cloudflare.com/?to=/:account/turnstile) for your domain and set both halves (leave them unset to run without a challenge):

```bash
wrangler secret put TURNSTILE_SITE_KEY
wrangler secret put TURNSTILE_SECRET_KEY
```

Rate limits for the credential endpoints and the public API are configured in `wrangler.jsonc` (`ratelimits`); adjust the budgets there.

Update the vars in `wrangler.jsonc`:

- `BETTER_AUTH_URL`: your deployed origin.
- `MAIL_FROM`: a sender on a Resend-verified domain. The default `onboarding@resend.dev` only delivers to the Resend account owner.
- `STRIPE_PRICE_PAID`: the paid plan's price id (per-seat, monthly).
- `OPENPANEL_CLIENT_ID`: your OpenPanel client id. Add your deployed origin to the client's allowed domains in the OpenPanel dashboard so browser events are accepted.

## Promote the first admin

The admin panel at `/app/admin` is gated on `user.role`, which nothing client-facing can set. Promote yourself once the account exists, then add any further admins from the panel:

```bash
wrangler d1 execute onyx-db --remote --command "UPDATE user SET role = 'admin' WHERE email = 'you@example.com'"
```

## Stripe

Billing needs four things in your live Stripe account:

1. A recurring per-seat price for the paid plan (its id goes in `STRIPE_PRICE_PAID`).
2. A webhook endpoint for `https://<your-origin>/api/auth/stripe/webhook` subscribed to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
3. The endpoint's signing secret in the `STRIPE_WEBHOOK_SECRET` worker secret.
4. A saved customer portal configuration (Settings → Billing → Customer portal): cancellation runs through the portal, and portal sessions fail until the live-mode configuration has been saved once.

## Observability

Logs and traces need no setup: both Workers deploy with `observability` enabled, so invocations are logged and every fetch and binding call is traced. Read them in the Cloudflare dashboard. Retention is 7 days on the Workers Paid plan.

Error tracking is optional and off until you set a DSN. To turn it on, create a Sentry project (JavaScript → Cloudflare Workers) and put its DSN in the `SENTRY_DSN` var in `wrangler.jsonc`. It is public and belongs in the file, not in a secret.

For readable stack traces, let CI upload source maps by adding three repository secrets. Without them the build simply skips the upload:

- `SENTRY_AUTH_TOKEN`: an organization token with `project:releases` scope.
- `SENTRY_ORG` and `SENTRY_PROJECT`: the slugs from the project's settings.

Cloudflare does not alert on Worker errors, so alerting comes from Sentry: add an alert rule (Alerts → Create Alert → Issues) to be emailed or Slacked on new issues. Every Sentry plan, including the free tier, also includes one uptime monitor and one cron monitor; point the uptime monitor at your origin.

A status page is separate again, and neither Cloudflare nor Sentry provides one. [Better Stack](https://betterstack.com) bundles a free page with its uptime monitors, and [OpenStatus](https://www.openstatus.dev) is the open-source option with monitoring-as-code. Both are account configuration; nothing in the repo changes.

## Push the schema

Push the Drizzle schema to production D1 (requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_TOKEN`):

```bash
cd private/db && pnpm push:remote
```

Pushing is the pre-release workflow. Once other people deploy and upgrade their own instances of your product, switch to committed migrations: see "Switching to migrations" in [private/db](private/db).

## Deploy

Pushes to `main` deploy automatically: once every CI check passes, the `deploy` job in `.github/workflows/ci.yml` ships `onyx-web` and `onyx-docs` with `wrangler deploy`. Two repository secrets authenticate it:

- `CLOUDFLARE_API_TOKEN`: an API token created from the "Edit Cloudflare Workers" template.
- `CLOUDFLARE_ACCOUNT_ID`: the target account id (shown by `wrangler whoami`).

CI never pushes the schema: `drizzle-kit push` prompts before destructive statements, so it cannot run unattended. Push the schema (above) before merging changes that depend on it. The deploy job does run `wrangler d1 migrations apply` first, which is a no-op until you switch to committed migrations (see "Switching to migrations" in [private/db](private/db)); after the switch, add Account > D1 > Edit to the API token, which the Workers template does not include.

To deploy by hand:

```bash
cd apps/web && pnpm run deploy    # vp build && wrangler deploy
cd apps/docs && pnpm run deploy
```

Cron triggers and workflow bindings are not in `wrangler.jsonc`: they are generated into the build output config from the `@repo/crons` and `@repo/workflows` registries, so deploys pick them up automatically.
