import * as Sentry from '@sentry/cloudflare';
import { createAnalyticsHandler } from '@stetcms/analytics/server';
import { createFileRoute } from '@tanstack/react-router';
import { env } from 'cloudflare:workers';

import { auth } from '#/auth-server';
import { enforceApiRateLimit } from '#/security';
import config from '#/stet.config';

/**
 * `false` forces recording off, and `undefined` leaves the decision to the
 * handler, which stays quiet while no key is configured. STET_API_KEY cannot
 * be the switch itself: it also generates the content client, so it is real on
 * a developer's machine, where their browsing must still stay out of the
 * project these dashboards read.
 */
function analyticsEnabled(): false | undefined {
  // Wrangler types a var as the literal in wrangler.jsonc, which a comparison
  // against any other string reads as unreachable.
  const configured: string = env.ANALYTICS_ENABLED;
  if (configured === 'false') {
    return false;
  }
  return undefined;
}

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
  enabled: analyticsEnabled(),
  onError: (error) => Sentry.captureException(error),
});

async function handle(request: Request): Promise<Response> {
  const limited = await enforceApiRateLimit(request);
  if (limited !== null) {
    return limited;
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
