import * as Sentry from '@sentry/cloudflare';
import { log } from '@repo/logging';
import { DEFAULT_ORIGIN } from '@stetcms/analytics';
import { createAnalyticsHandler } from '@stetcms/analytics/server';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';

import { auth } from '#/auth-server';
import { enforceApiRateLimit } from '#/security';
import config from '#/stet.config';

// The one route browser analytics needs. Events go browser → here → Stet, so
// the key never reaches the page, the reader's address never leaves our own
// infrastructure, and there is no third-party origin for a blocker to match.

type AnalyticsEnv = {
  STET_API_KEY?: string;
  STET_ORIGIN?: string;
};

let handler: ((request: Request) => Promise<Response>) | undefined;
let warned = false;

function getHandler(apiKey: string, origin: string): (request: Request) => Promise<Response> {
  handler ??= createAnalyticsHandler(config.analytics, {
    apiKey,
    origin,
    // The server is the trusted side, so identity is read from the session
    // here rather than accepted from the browser, which never sends it.
    // Signed-out readers leave both undefined, which reads as unknown.
    context: async (request) => {
      const session = await auth.api.getSession({ headers: request.headers });
      return {
        userId: session?.user.id,
        organizationId: session?.session.activeOrganizationId ?? undefined,
      };
    },
    onError: (error) => Sentry.captureException(error),
  });
  return handler;
}

async function handle(request: Request): Promise<Response> {
  // Public and unauthenticated, so it takes the ingest budget rather than the
  // API one: a busy page makes far more of these than it makes content reads.
  const limited = await enforceApiRateLimit(request);
  if (limited !== null) {
    return limited;
  }

  const { STET_API_KEY: apiKey, STET_ORIGIN: origin } = env as AnalyticsEnv;
  if (apiKey === undefined || apiKey === '') {
    if (!warned) {
      warned = true;
      log.info('analytics', 'events are dropped: STET_API_KEY is unset');
    }
    // Accepted and thrown away. A 4xx would only teach the client to retry a
    // batch that has nowhere to go.
    return Response.json({ accepted: 0 });
  }

  return getHandler(apiKey, origin ?? DEFAULT_ORIGIN)(request);
}

export const Route = createFileRoute('/api/analytics')({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
