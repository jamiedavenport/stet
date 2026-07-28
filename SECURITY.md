# Security

## Reporting a vulnerability

Email [hello@jxd.dev](mailto:hello@jxd.dev) with a description and, where possible, steps to reproduce. Do not open a public issue for anything exploitable. Reports are acknowledged within a few days.

## What ships

- Session, socket, and agent entry points verify organization membership server-side on every request.
- Credential endpoints are rate limited per IP and support Cloudflare Turnstile (set `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`).
- The public API is rate limited per key on top of per-plan quotas.
- HTML responses carry HSTS, `nosniff`, framing, referrer, and permissions headers, plus a report-only Content Security Policy staged for enforcement.
- Webhooks are signed per the Standard Webhooks spec; secrets are stored per endpoint and rotate with a 24 hour grace window.
