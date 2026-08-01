import { createAnalyticsHandler } from '@stetcms/analytics/server';

import config from '../../stet.config';

// The one route analytics needs. Events go browser → here → Stet, so the API
// key stays on this side and the reader's address never leaves it.
const handler = createAnalyticsHandler(config.analytics, { origin: config.origin });

export default defineEventHandler((event) => handler(toWebRequest(event)));
