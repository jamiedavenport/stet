import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

import './globals.css';

export const metadata: Metadata = {
  title: 'Stet example',
};

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
