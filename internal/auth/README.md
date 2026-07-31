# @repo/auth

Better Auth configuration shared by the web app and the CLI.

- `./server`: builds the Better Auth instance served at `/api/auth/*`. Email + password with verification and reset, Google and GitHub social sign-in with account linking, emailed magic links (sign-in only, requested from `/sign/link`), WebAuthn passkeys (registered from the personal settings page), two-factor authentication (TOTP with backup codes), email change and account deletion, organizations with invitations, organization API keys (sent as `x-api-key`), platform administration (`user.role`, bans, impersonation, behind `/app/admin`), the OAuth device flow used by `stet login`, and Stripe subscriptions per organization (upgrade via Checkout, webhook at `/api/auth/stripe/webhook`). Sessions are stored in D1 via the Drizzle adapter.
- `./client`: the browser client with matching plugins for the web app. Its `twoFactorClient` sends an enrolled user to `/sign/2fa` after the password step.
- `./access`: the organization access control. Extends Better Auth's default statements with an `apiKey` resource so owners and admins (not just owners) manage organization API keys, and exports `canManageOrganization`, the one owner-or-admin rule the middlewares and UI share.

Magic links sign in existing accounts only (`disableSignUp`): the request endpoint reports success either way, and the send callback skips unknown addresses, so the form never reveals whether an account exists. Tokens are stored hashed and expire after five minutes. Passkeys are bound to the origin's hostname (`rpID` derived from the base URL), so credentials registered on one deployment don't carry to another.

Bot protection: when `turnstileSecretKey` is set, the captcha plugin requires a Cloudflare Turnstile token (`x-captcha-response` header) on sign-in, sign-up, password-reset requests, and magic-link requests. The web app renders the widget whenever `TURNSTILE_SITE_KEY` is configured and holds the submit button until a token arrives.

`user.role` is platform-wide and distinct from a member's role within an organization. The admin plugin marks it `input: false`, so nothing client-facing can grant it: promote the first admin with SQL (see [DEPLOY.md](../../DEPLOY.md)) and the rest from the panel.

Within an organization, members hold one of three roles: `owner`, `admin`, or `member`. Owners and admins manage the roster (roles are changed from the organization settings page), invitations, webhooks, and API keys; only owners may touch other owners or grant ownership, and Better Auth refuses to leave an organization without one. The web app's `organizationAdminMiddleware` applies the same rule to its own server functions.

Signup and invite side effects live here: signing up enqueues the `send-welcome-email` job, and sending an organization invite starts the `invitation-reminder` workflow. Plan limits are enforced here too: `membershipLimit` and the `beforeCreateInvitation` hook cap members using the guards from `@repo/billing`.

Secrets: `BETTER_AUTH_SECRET` (and optionally `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`, plus `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` for social sign-in) in `apps/web/.dev.vars` locally, Worker secrets in production. A social provider is offered only when both its id and secret are set; each provider's OAuth callback is `{BETTER_AUTH_URL}/api/auth/callback/{google|github}`.
