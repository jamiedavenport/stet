import { createAnalytics } from '@stetcms/analytics/client';

import type config from '../../stet.config';

// Typed from the plan in stet.config.ts by a type-only import, so no schema
// and no key reach the browser bundle. Everything goes to our own route,
// which is why there is nothing here for a blocker to recognise.
//
// autoPageviews is off because this is a single-page app: the router knows
// what counts as a navigation, and the client's fallback (patching
// history.pushState) cannot see a replaceState, which routers use for
// redirects and search-parameter changes. Pageviews are recorded from
// afterNavigate in the root layout instead.
export const analytics = createAnalytics<(typeof config)['analytics']>({
  endpoint: '/api/analytics',
  autoPageviews: false,
});
