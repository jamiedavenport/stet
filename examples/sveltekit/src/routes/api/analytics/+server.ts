import { createAnalyticsHandler } from '@stetcms/analytics/server';

import config from '../../../../stet.config';
import type { RequestHandler } from './$types';

// The one route analytics needs. Events go browser → here → Stet, so the API
// key stays on this side and the reader's address never leaves it.
const handler = createAnalyticsHandler(config.analytics, { origin: config.origin });

export const POST: RequestHandler = ({ request }) => handler(request);
