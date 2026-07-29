import { useEffect } from 'react';
import { createAnalytics } from '@stetcms/analytics/client';
import { useLocation } from '@tanstack/react-router';

import type config from '../stet.config';

// Typed from the plan in stet.config.ts by a type-only import, so no schema
// and no key reach the browser bundle. Everything goes to our own route,
// which is why there is nothing here for a blocker to recognise.
//
// autoPageviews is off because this is a single-page app: the router knows
// what counts as a navigation, and the client's fallback (patching
// history.pushState) cannot see a replaceState, which routers use for
// redirects and search-parameter changes.
export const analytics = createAnalytics<(typeof config)['analytics']>({
  endpoint: '/api/analytics',
  autoPageviews: false,
});

/**
 * Records a pageview on first render and on every navigation. Called from the
 * root route so it runs on every page; called from one route it would only
 * start counting once a visitor happened to open that route.
 */
export function usePageviews(): void {
  const location = useLocation();

  useEffect(() => {
    analytics.pageview();
  }, [location.href]);
}
