import { cn } from '../lib/utils';
import type { ReactNode } from 'react';

// Divider padding follows a first/middle/last pattern so rows sit flush with
// the section edges.

function rowDividers(i: number, count: number) {
  if (i === 0) {
    return 'pb-5';
  }
  if (i === count - 1) {
    return 'border-t border-border pt-5';
  }
  return 'border-t border-border py-5';
}

/** Section wrapper for the rail-and-body row lists on /blog and /changelog. */
export function RailList({ children }: { children: ReactNode }) @{
  <section className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 lg:px-8">{children}</div>
  </section>
}

/** One list row: metadata on the left rail, content on the right. */
export function RailRow({ rail, children }: { rail: ReactNode; children: ReactNode }) @{
  <article className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-border py-10 first:border-t-0 lg:grid-cols-[16rem_1fr]">
    {rail}
    <div>{children}</div>
  </article>
}

export function TermRows({
  rows,
  className,
}: {
  rows: { term: string; detail: ReactNode }[];
  className?: string;
}) @{
  <dl className={cn('text-sm/6', className)}>
    @for (const row of rows; index i; key row.term) {
      <div
        className={cn(
          'grid grid-cols-1 gap-y-2 sm:grid-cols-[18rem_1fr] sm:gap-x-8 sm:gap-y-0',
          rowDividers(i, rows.length),
        )}
      >
        <dt className="font-medium text-foreground">{row.term}</dt>
        <dd className="max-w-[56ch] text-muted-foreground">{row.detail}</dd>
      </div>
    }
  </dl>
}
