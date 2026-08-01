import { useEffect } from 'react';
import { createAnalytics } from '@stetcms/analytics/client';
import { useLocation, useRouterState } from '@tanstack/react-router';

import type config from '#/stet.config';

// autoPageviews is off because this is a single-page app: the router knows what
// counts as a navigation, and the client's fallback (patching history.pushState)
// cannot see a replaceState, which routers use for redirects and search changes.
const analytics = createAnalytics<(typeof config)['analytics']>({
  endpoint: '/api/analytics',
  autoPageviews: false,
});

/** Records a pageview on first render and on every navigation. */
export function usePageviews(): void {
  const location = useLocation();
  const route = useRouterState({
    select: (state) => state.matches.at(-1)?.fullPath,
  });

  useEffect(() => {
    // The router's href, not window.location: the router has already advanced
    // when this runs and window.location has not, so letting the client read it
    // would label every pageview with the previous page.
    analytics.pageview(`${window.location.origin}${location.href}`, { route });
  }, [location.href, route]);
}
