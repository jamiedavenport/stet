import { createAnalytics } from '@stetcms/analytics/client';

import type config from '../stet.config';

// Typed from the plan in stet.config.ts by a type-only import, so no schema
// and no key reach the browser bundle. Everything goes to our own route,
// which is why there is nothing here for a blocker to recognise.
//
// autoPageviews stays on: every Astro navigation here is a real page load,
// so the client's on-load pageview counts each one exactly once.
export const analytics = createAnalytics<(typeof config)['analytics']>({
  endpoint: '/api/analytics',
});
