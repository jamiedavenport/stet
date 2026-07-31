# Deploying

The whole app deploys as one Cloudflare Worker, `stet-web`, configured in `apps/web/wrangler.jsonc`. The docs site deploys as a second Worker, `stet-docs`, which has no bindings or secrets of its own.

## One-time setup

### Domains

`stet-web` serves `stetcms.com` and answers on `www.stetcms.com`, which it
redirects to the apex (`apps/web/src/canonical-host.ts`); `stet-docs` serves
`docs.stetcms.com`. All three are `custom_domain` routes, so `wrangler deploy`
creates the DNS record and certificate for each. A hostname that already has a
DNS record in the zone fails the deploy until that record is removed, which is
the usual snag on `www`.

Create the resources the Worker binds to:

```bash
wrangler d1 create stet-db              # put the database_id in wrangler.jsonc
wrangler r2 bucket create stet-storage
wrangler queues create stet-jobs
wrangler queues create stet-jobs-dlq
```

Durable Objects need nothing created either: `ANALYTICS` (one store per
organization, holding its product analytics), `PAGE_PRESENCE`, `CHAT_AGENT`,
`CONTENT_CHANGES` (one per organization, batching its content changes into a
single webhook), and `NOTIFICATION_HUB` are all declared in `wrangler.jsonc`
and provisioned by the deploy. The analytics store applies its own schema on
wake, so there is no migration step for it; see
[internal/analytics](internal/analytics).

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
```

Analytics is optional: without `STET_API_KEY` no product analytics are recorded, and both the mounted route and the Worker's own `capture()` drop the events. The key is an organization API key on the Stet in `STET_ORIGIN`, made under Developers → API keys once that deployment is up and an organization exists:

```bash
wrangler secret put STET_API_KEY
```

Recording is switched off by `ANALYTICS_ENABLED` in `wrangler.jsonc`, not by removing the key, because the same key generates the content client and so is real anywhere content is generated, a developer's machine included. Only the literal `"false"` turns it off; blank leaves it to whether a key is configured. Set it to `"false"` on any deployment whose traffic should stay out of your dashboards, such as a preview or staging environment sharing the production key.

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

Rate limits for the credential endpoints, the public API, and analytics ingest are configured in `wrangler.jsonc` (`ratelimits`); adjust the budgets there. Ingest has its own, far larger budget and does not spend the organization's API request quota: it is one request per browser batch, so a busy site makes orders of magnitude more of them than it makes content reads.

Update the vars in `wrangler.jsonc`:

- `BETTER_AUTH_URL`: your deployed origin.
- `MAIL_FROM`: a sender on a Resend-verified domain. The default `onboarding@resend.dev` only delivers to the Resend account owner.
- `STRIPE_PRICE_PAID`: the paid plan's price id (per-seat, monthly).
- `STET_ORIGIN`: the Stet that this deployment's own product analytics go to. Pointing it at your own origin is the dogfooding default: events leave the Worker and come back in through the public API, so you run the path your customers take.

## Promote the first admin

The admin panel at `/app/admin` is gated on `user.role`, which nothing client-facing can set. Promote yourself once the account exists, then add any further admins from the panel:

```bash
wrangler d1 execute stet-db --remote --command "UPDATE user SET role = 'admin' WHERE email = 'you@example.com'"
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
cd internal/db && pnpm push:remote
```

Pushing is the pre-release workflow. Once other people deploy and upgrade their own instances of your product, switch to committed migrations: see "Switching to migrations" in [internal/db](internal/db).

## Deploy

Pushes to `main` deploy automatically: once every CI check passes, the `deploy` job in `.github/workflows/ci.yml` ships `stet-web` and `stet-docs` with `wrangler deploy`. Two repository secrets authenticate it:

- `CLOUDFLARE_API_TOKEN`: an API token created from the "Edit Cloudflare Workers" template.
- `CLOUDFLARE_ACCOUNT_ID`: the target account id (shown by `wrangler whoami`).

CI never pushes the schema: `drizzle-kit push` prompts before destructive statements, so it cannot run unattended. Push the schema (above) before merging changes that depend on it. The deploy job runs `wrangler d1 migrations apply` first, skipped while no migrations directory exists; once you switch to committed migrations (see "Switching to migrations" in [internal/db](internal/db)), add Account > D1 > Edit to the API token, which the Workers template does not include.

To deploy by hand:

```bash
cd apps/web && pnpm run deploy    # vp build && wrangler deploy
cd apps/docs && pnpm run deploy
```

Cron triggers and workflow bindings are not in `wrangler.jsonc`: they are generated into the build output config from the `@repo/crons` and `@repo/workflows` registries, so deploys pick them up automatically.
