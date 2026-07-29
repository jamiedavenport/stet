import type { ReactNode } from 'react';
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router';

import { usePageviews } from '../analytics';
import stylesUrl from '../styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Stet example' },
    ],
    links: [{ rel: 'stylesheet', href: stylesUrl }],
  }),
  component: RootComponent,
});

function RootComponent() {
  // In the root, so every page is counted rather than only the routes that
  // happen to import the analytics client themselves.
  usePageviews();

  return (
    <RootDocument>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/blog">Blog</Link>
      </nav>
      <Outlet />
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
