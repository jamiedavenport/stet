import type { CSSProperties } from 'react';
import { cn } from '@repo/ui/lib/utils';

import { MockCrumbs, MockShell } from '#/marketing/mockups/frame.tsrx';

// The analytics page, drawn from the same card, bar and range-picker parts
// the product uses. Only one hue is in play, and only where data lives.

const stats = [
  { label: 'Visitors', value: '18,204', hint: 'Distinct readers, counted per day' },
  { label: 'Views', value: '42,981', hint: 'Pages opened' },
  { label: 'Events', value: '96,330', hint: 'Everything recorded' },
];

const series = [38, 52, 44, 61, 57, 72, 66, 81, 74, 92, 86, 78, 95, 88];

const pages = [
  { key: '/blog/both-teams-at-full-speed', count: 8412 },
  { key: '/pricing', count: 5109 },
  { key: '/blog/modelling-without-a-ticket', count: 3877 },
  { key: '/', count: 2960 },
  { key: '/docs/quickstart', count: 1544 },
];

const ranges = ['24h', '7d', '30d', '12m'];

function StatCard({ stat }: { stat: { label: string; value: string; hint: string } }) @{
  <div className="flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
    <p className="truncate text-sm text-muted-foreground">{stat.label}</p>
    <p className="text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
    <p className="truncate text-xs text-muted-foreground">{stat.hint}</p>
  </div>
}

/** Views over time, as bars whose height is the only variable. */
function TrafficChart() @{
  <div className="flex h-40 items-end gap-1.5">
    @for (const point of series; index i; key i) {
      <div
        className="h-(--bar) min-w-0 flex-1 rounded-t-sm bg-chart-1/80"
        style={{ '--bar': `${point}%` } as CSSProperties}
      />
    }
  </div>
}

const largest = pages[0]?.count ?? 1;

function Breakdown() @{
  <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
    <p className="text-sm font-medium">Top pages</p>
    <ul role="list" className="flex flex-col gap-0.5">
      @for (const page of pages; key page.key) {
        <li className="relative flex items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm">
          <span
            className="absolute inset-y-0 left-0 w-(--share) rounded-sm bg-chart-1/12"
            style={{ '--share': `${(page.count / largest) * 100}%` } as CSSProperties}
          />
          <span className="relative truncate">{page.key}</span>
          <span className="relative shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {page.count.toLocaleString('en-GB')}
          </span>
        </li>
      }
    </ul>
  </div>
}

/**
 * The analytics page: first-party numbers sitting beside the content they
 * describe, with no consent banner in front of them.
 */
export function AnalyticsMockup() @{
  <MockShell active="Analytics">
    <MockCrumbs trail={['Marketing', 'Analytics']} />
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight">Analytics</p>
          <p className="mt-1 text-sm text-muted-foreground">How every page performs.</p>
        </div>
        <div className="flex items-center gap-1">
          @for (const range of ranges; key range) {
            <span
              className={cn(
                'flex h-7 items-center rounded-md px-2.5 text-sm',
                range === '7d' ? 'bg-secondary font-medium' : 'text-muted-foreground',
              )}
            >
              {range}
            </span>
          }
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-3">
        @for (const stat of stats; key stat.label) {
          <StatCard stat={stat} />
        }
      </div>
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Views over time</p>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </div>
        <TrafficChart />
      </div>
      <Breakdown />
    </div>
  </MockShell>
}
