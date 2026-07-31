import * as Sentry from '@sentry/cloudflare';
import { log } from '@repo/logging';
import { createAnalyticsHandler } from '@stetcms/analytics/server';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';

import { auth } from '#/auth-server';
import { enforceApiRateLimit } from '#/security';
import config from '#/stet.config';

const handler = createAnalyticsHandler(config.analytics, {
  // The server is the trusted side, so identity comes from the session rather
  // than from the browser. Undefined values are skipped, which leaves the
  // context @dogfood/analytics sends from the Worker intact.
  context: async (request) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return {
      userId: session?.user.id,
      organizationId: session?.session.activeOrganizationId ?? undefined,
    };
  },
  onError: (error) => Sentry.captureException(error),
});

let warned = false;

async function handle(request: Request): Promise<Response> {
  const limited = await enforceApiRateLimit(request);
  if (limited !== null) {
    return limited;
  }

  // A blank key is the documented local default, not a fault, so it answers
  // normally instead of letting the handler call it a 500 on every batch.
  if (env.STET_API_KEY === '') {
    if (!warned) {
      warned = true;
      log.info('analytics', 'events are dropped: STET_API_KEY is unset');
    }
    return Response.json({ accepted: 0 });
  }

  return handler(request);
}

export const Route = createFileRoute('/api/analytics')({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
    },
  },
});
