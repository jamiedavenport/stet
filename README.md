[![Onyx](./assets/banner.png)](https://onyx.jxd.dev)

The TypeScript starter kit from [jxd.dev](https://jxd.dev): a full-stack SaaS foundation on Cloudflare, powered by Vite+ and pnpm workspaces.

- Cloudflare by default. Portable to other deployment targets.
- End-to-end type safety, from the D1 schema to the published API client.
- World class developer experience: one command runs the whole platform locally.

## Features

- Authentication with email verification and password reset, Google and GitHub sign-in, magic links, passkeys, and two-factor (TOTP) with backup codes.
- Account security: change password or email, passkeys, connected social accounts, and active-session management.
- Admin panel: platform stats, user and organization search, bans, and impersonation.
- Organizations with invitations and member management.
- Stripe subscriptions per organization: free and paid plans, per-seat billing, usage metering with per-plan quotas, and plan guards at every layer.
- Public REST API with API keys, a typed client, and a CLI with browser login.
- Outbound webhooks per organization, signed per the Standard Webhooks spec.
- File uploads: organization-scoped assets stored in R2, uploaded straight from the browser, served with per-tenant authorization and on-the-fly image resizing.
- Transactional email.
- Internationalization: English, Spanish, and French out of the box, per-user language, localized emails.
- Realtime collaboration and presence, with a rich text editor: formatting toolbar, slash commands, `@` mentions that notify, tables, task lists, syntax-highlighted code, and image uploads. Shared documents persist to the database, so server functions, the public API, and exports can read them without a live session.
- AI assistant.
- Product analytics with a type-safe event registry, gated behind consent.
- Privacy and cookie policies plus a consent banner, generated from one typed [PolicyStack](https://www.policystack.dev) config.
- Scheduled tasks, background jobs, and durable workflows.
- Observability: Cloudflare logs and traces, wide-event structured logging, and optional Sentry error tracking.
- Accessible UI component library.
- Marketing site and blog powered by content-collections, with a changelog, RSS, sitemap, llms.txt, and OG images.
- End-to-end tests and CI.
- Automated npm releases.
- Documentation site with a generated OpenAPI reference.

## License

The template is source-available under the [Onyx License](LICENSE.md): the Functional Source License (FSL-1.1-Apache-2.0) plus an End Products grant, so you can build and even open-source commercial products on it, but not resell it as a starter kit. It converts to Apache 2.0 two years after each release. The `published/*` npm packages are plain [Apache 2.0](published/client/LICENSE).

## Quick start

```bash
vp install
vp run dev   # http://localhost:3000
```

Local dev simulates everything: D1, R2, Queues, Cron Triggers, Workflows, and Durable Objects.

- [CONTRIBUTING.md](CONTRIBUTING.md): development workflow, checks, conventions, releases.
- [DEPLOY.md](DEPLOY.md): shipping to Cloudflare.
- [Make it your own](apps/docs/content/docs/make-it-your-own.mdx): the checklist for turning the template into your product.

## What's inside

Everything runs in a single Cloudflare Worker (`onyx-web`). Each piece lives in a focused package with its own README.

### Apps

| Package                  | Description                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| [`apps/web`](apps/web)   | Primary web application (TanStack Start). Wires every package into the Worker. |
| [`apps/docs`](apps/docs) | Documentation site (Fumadocs on TanStack Start), deployed as its own Worker.   |

### Private packages

Internal packages shared by the applications. Not intended for external distribution.

| Package                                          | Description                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [`private/ui`](private/ui)                       | shadcn/ui components on Base UI with Tailwind v4.                                                                           |
| [`private/brand`](private/brand)                 | Product identity (name, logo) shared by every app and package.                                                              |
| [`private/auth`](private/auth)                   | Better Auth: email + password, Google/GitHub OAuth, two-factor, organizations, API keys, device flow, Stripe subscriptions. |
| [`private/billing`](private/billing)             | Feature catalog, plans, usage metering, and guards for organization billing.                                                |
| [`private/db`](private/db)                       | Drizzle schema and typed data access on Cloudflare D1.                                                                      |
| [`private/api`](private/api)                     | Public API contract (oRPC + Zod) and OpenAPI generation.                                                                    |
| [`private/mail`](private/mail)                   | React Email templates delivered with Resend.                                                                                |
| [`private/i18n`](private/i18n)                   | Paraglide internationalization: compiled messages, per-user locales, localized email.                                       |
| [`private/ai`](private/ai)                       | Chat agent on the Cloudflare Agents SDK.                                                                                    |
| [`private/realtime`](private/realtime)           | Yjs collaboration and presence on Durable Objects.                                                                          |
| [`private/notifications`](private/notifications) | In-app notification feed and batched email digests.                                                                         |
| [`private/webhooks`](private/webhooks)           | Outbound per-organization webhooks with Standard Webhooks signatures.                                                       |
| [`private/analytics`](private/analytics)         | Type-safe product analytics on OpenPanel.                                                                                   |
| [`private/logging`](private/logging)             | Wide-event structured logging on evlog.                                                                                     |
| [`private/crons`](private/crons)                 | Scheduled jobs on Cron Triggers.                                                                                            |
| [`private/jobs`](private/jobs)                   | Typed background jobs on Cloudflare Queues.                                                                                 |
| [`private/workflows`](private/workflows)         | Durable multi-step processes on Cloudflare Workflows.                                                                       |

### Published packages

Reusable libraries versioned with Changesets and published to npm.

| Package                                | Description                                                  |
| -------------------------------------- | ------------------------------------------------------------ |
| [`published/client`](published/client) | `@jxdltd/onyx-client`, the typed client for the Onyx API.    |
| [`published/cli`](published/cli)       | `@jxdltd/onyx-cli`, the `onyx` command line interface.       |
| [`published/vite`](published/vite)     | `@jxdltd/onyx-vite`, the Vite plugin scaffold for consumers. |
