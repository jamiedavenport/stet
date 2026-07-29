import { createAnalyticsHandler } from '@stetcms/analytics/server';
import { createFileRoute } from '@tanstack/react-router';

import config from '../../stet.config';

// The one route analytics needs. Events go browser → here → Stet, so the API
// key stays on this side and the reader's address never leaves it.
const handler = createAnalyticsHandler(config.analytics, { origin: config.origin });

export const Route = createFileRoute('/api/analytics')({
  server: {
    handlers: {
      POST: ({ request }) => handler(request),
    },
  },
});
