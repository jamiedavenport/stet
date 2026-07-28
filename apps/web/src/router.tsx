import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { routeTree } from './routeTree.gen';

export function getRouter() {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Runs beforeLoad and loaders when a link is hovered or touched, so the
    // click itself lands on already-loaded data.
    defaultPreload: 'intent',
    // TanStack Query owns data freshness; without this the router's built-in
    // 30-second preload cache would short-circuit the query cache.
    defaultPreloadStaleTime: 0,
  });

  // Dehydrates queries fetched during SSR into the HTML, hydrates them on the
  // client, and wraps the app in a QueryClientProvider.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}
