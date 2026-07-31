import { cn } from '../lib/utils';
import type { ReactNode } from 'react';

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

/**
 * Term-and-detail pairs, stacked in two columns. The same shape the argument
 * bands use, rather than a ruled rail that leaves a third of the row empty
 * and sets the answer in a narrow strip down the middle of the page.
 */
export function TermRows({
  rows,
  className,
}: {
  rows: { term: string; detail: ReactNode }[];
  className?: string;
}) @{
  <dl className={cn('grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2', className)}>
    @for (const row of rows; key row.term) {
      <div>
        <dt className="text-lg font-medium text-balance">{row.term}</dt>
        <dd className="mt-3 max-w-[56ch] text-base/7 text-pretty text-muted-foreground">
          {row.detail}
        </dd>
      </div>
    }
  </dl>
}
