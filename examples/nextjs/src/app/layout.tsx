import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'Stet example',
};

// Stet content is live-only: what an editor saves is what the API serves. Every
// route renders on request so edits show up on the next refresh, and `next
// build` never needs a running Stet to prerender against. Set in the root
// layout, so it covers each page below rather than relying on every new page
// remembering it.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/">Home</Link>
          <Link href="/blog">Blog</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
