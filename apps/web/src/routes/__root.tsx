import type { ReactNode } from 'react';
import { brand } from '@repo/brand';
import type { QueryClient } from '@tanstack/react-query';
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';

import { ensureAnalyticsClientId } from '#/analytics/client-id';
import { ConsentRuntime } from '#/legal/consent-runtime';
import { NotFound } from '#/components/not-found.tsrx';
import { ensureSession } from '#/session';
import faviconUrl from '@repo/brand/logo.svg?url';
import appCss from '#/style.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Resolve the session for every route, including marketing: a cookie-cache
  // read (see #/session), not a D1 query. Only /app also fetches orgs.
  beforeLoad: async ({ context }) => {
    const [analyticsClientId, session] = await Promise.all([
      ensureAnalyticsClientId(context.queryClient),
      ensureSession(context.queryClient),
    ]);
    return { analyticsClientId, session };
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: brand.name },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: faviconUrl, type: 'image/svg+xml' },
      {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: `${brand.name} Blog`,
        href: '/rss.xml',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
      <ConsentRuntime />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
