import { brand } from '@repo/brand';
import { BrandMark } from '@repo/brand/mark';
import type { ReactNode } from 'react';

// Centered single-card chrome for pages outside the sidebar app shell
// (sign-in/up, create org, accept invite).
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 bg-sidebar px-6 py-12">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-7" />
        <p className="text-xl font-semibold tracking-tight">{brand.name}</p>
      </div>
      <div className="w-full max-w-xs">{children}</div>
    </main>
  );
}
