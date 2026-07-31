import { useEffect } from 'react';
import { createAnalytics } from '@stetcms/analytics/client';
import { useLocation } from '@tanstack/react-router';

import type config from '#/stet.config';

// The browser analytics client, typed from the plan by a type-only import, so
// no schema and no key reach the bundle and everything goes to our own route.
// Not exported: pageviews are all the browser records today, so the first
// track() call site is what should export it.
//
// autoPageviews is off because this is a single-page app: the router knows
// what counts as a navigation, and the client's fallback (patching
// history.pushState) cannot see a replaceState, which routers use for
// redirects and search-parameter changes.
const analytics = createAnalytics<(typeof config)['analytics']>({
  endpoint: '/api/analytics',
  autoPageviews: false,
});

/**
 * Records a pageview on first render and on every navigation. Called from the
 * root component so it runs everywhere; called from one route it would only
 * start counting once a visitor happened to open that route.
 */
export function usePageviews(): void {
  const location = useLocation();

  useEffect(() => {
    // The router's href, not window.location: at the time this effect runs the
    // router has already advanced and window.location has not, so letting the
    // client read it would label every pageview with the previous page.
    analytics.pageview(`${window.location.origin}${location.href}`);
  }, [location.href]);
}
