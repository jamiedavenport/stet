import { brand } from '@repo/brand';
import { initLogging } from '@repo/logging';
import type { CloudflareOptions } from '@sentry/cloudflare';

// Module scope: the worker entry imports this before any handler can run, so
// every wide event carries the service and environment. The service matches
// the worker name in wrangler.jsonc by the `<slug>-web` convention.
initLogging({ service: `${brand.slug}-web`, production: import.meta.env.PROD });

/**
 * Sentry options for the worker, its Durable Objects, and its workflow.
 *
 * A blank DSN disables the SDK rather than omitting it, so `captureException`
 * stays a no-op instead of throwing: that is what a fork with no Sentry
 * account runs. Tracing stays with Cloudflare (`observability.traces` in
 * wrangler.jsonc), so Sentry carries exceptions only and the free tier is
 * enough.
 */
export function sentryOptions<E extends { SENTRY_DSN: string }>(env: E): CloudflareOptions {
  return {
    dsn: env.SENTRY_DSN,
    enabled: env.SENTRY_DSN !== '',
    tracesSampleRate: 0,
    sendDefaultPii: false,
  };
}
