import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@repo/ui/components/chart';
import type { ChartConfig } from '@repo/ui/components/chart';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Area, AreaChart, Line } from 'recharts';

import { analyticsOverviewQuery } from '#/analytics/functions';

const config = {
  views: { label: 'Views', color: 'var(--chart-1)' },
  visitors: { label: 'Visitors', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const topPageCount = 4;

/**
 * The last seven days at a glance: totals, a small trend, and the pages
 * doing the work. The full dashboard stays one click away.
 */
export function AnalyticsSnapshot() @{
  const { data } = useSuspenseQuery(analyticsOverviewQuery('7d'));
  const pages = data.breakdowns.path.slice(0, topPageCount);
  const largest = pages[0]?.count ?? 0;

  <section aria-labelledby="analytics-snapshot-heading" className="@container">
    <Card size="sm" className="gap-4">
      <CardContent className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="analytics-snapshot-heading" className="text-sm font-medium">{"Last 7 days"}</h2>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="-my-1 text-muted-foreground"
          render={<Link to="/app/analytics" />}
        >
          {"View analytics"}
        </Button>
      </CardContent>
      @if (data.totals.events === 0) {
        <CardContent>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
            {"Nothing recorded yet. Mount the analytics route in your app and traffic appears here within seconds."}
          </p>
        </CardContent>
      } @else {
        <CardContent className="grid grid-cols-1 gap-6 @2xl:grid-cols-[3fr_2fr]">
          <div className="flex min-w-0 flex-col gap-4">
            <dl className="flex">
              <div className="flex flex-col gap-0.5 pr-6">
                <dt className="text-xs text-muted-foreground">{"Visitors"}</dt>
                <dd className="text-lg font-semibold tracking-tight tabular-nums">
                  {data.totals.visitors.toLocaleString('en-GB')}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-foreground/10 pl-6">
                <dt className="text-xs text-muted-foreground">{"Views"}</dt>
                <dd className="text-lg font-semibold tracking-tight tabular-nums">
                  {data.totals.pageviews.toLocaleString('en-GB')}
                </dd>
              </div>
            </dl>
            <Sparkline points={data.timeseries} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h3 className="text-xs text-muted-foreground">{"Top pages"}</h3>
            <ul role="list" className="flex flex-col gap-0.5">
              @for (const row of pages; key row.key) {
                <li className="relative flex items-center justify-between gap-4 rounded-sm px-2 py-1 text-sm">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 rounded-sm bg-chart-1/12"
                    style={{ width: `${largest === 0 ? 0 : (row.count / largest) * 100}%` }}
                  />
                  <span className="relative min-w-0 truncate" title={row.key}>{row.key}</span>
                  <span className="relative shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {row.count.toLocaleString('en-GB')}
                  </span>
                </li>
              }
            </ul>
          </div>
        </CardContent>
      }
    </Card>
  </section>
}

/** The dashboard's traffic chart shrunk to a trend: no axes, no grid, no legend. */
function Sparkline({ points }: { points: { bucket: number; views: number; visitors: number }[] }) @{
  const data = points.map((point) => ({
    label: new Date(point.bucket).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    views: point.views,
    visitors: point.visitors,
  }));

  <ChartContainer config={config} className="h-24 w-full">
    <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
      <ChartTooltip cursor={{ stroke: 'var(--chart-grid)' }} content={<ChartTooltipContent />} />
      <Area
        dataKey="views"
        type="monotone"
        stroke="var(--color-views)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="var(--color-views)"
        fillOpacity={0.12}
        isAnimationActive={false}
        activeDot={{ r: 3, stroke: 'var(--card)', strokeWidth: 2 }}
      />
      <Line
        dataKey="visitors"
        type="monotone"
        stroke="var(--color-visitors)"
        strokeWidth={2}
        strokeLinecap="round"
        dot={false}
        isAnimationActive={false}
        activeDot={{ r: 3, stroke: 'var(--card)', strokeWidth: 2 }}
      />
    </AreaChart>
  </ChartContainer>
}
