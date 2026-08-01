import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Card, CardContent } from '@repo/ui/components/card';
import { useQuery } from '@tanstack/react-query';

import { BreakdownCard } from '#/analytics/breakdown-card.tsrx';
import { analyticsOverviewQuery, breakdownPanels, rangeKeys, ranges } from '#/analytics/functions';
import type { RangeKey } from '#/analytics/functions';
import { TrafficChart } from '#/analytics/traffic-chart.tsrx';
import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';

const stats = [
  { key: 'visitors', label: 'Visitors', hint: 'Distinct readers, counted per day' },
  { key: 'pageviews', label: 'Views', hint: 'Pages opened' },
  { key: 'events', label: 'Events', hint: 'Everything recorded' },
] as const;

export function AnalyticsDashboard() @{
  useBreadcrumbs([{ label: 'Analytics' }]);
  const [range, setRange] = useState<RangeKey>('7d');
  const overview = useQuery(analyticsOverviewQuery(range));
  const data = overview.data;

  <div className="flex w-full flex-col gap-6">
    <PageHeader
      title={"Analytics"}
      description={"How every page performs. Cookieless, first-party, and served through your own backend."}
    >
      <div role="group" aria-label="Time range" className="flex items-center gap-1">
        @for (const key of rangeKeys; key key) {
          <Button
            variant={key === range ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={key === range}
            onClick={() => setRange(key)}
          >
            {key}
          </Button>
        }
      </div>
    </PageHeader>

    <div className="@container flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-3">
        @for (const stat of stats; key stat.key) {
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="truncate text-sm text-muted-foreground">{stat.label}</p>
              <p
                data-testid={`stat-${stat.key}`}
                className="text-2xl font-semibold tracking-tight tabular-nums"
              >
                {data === undefined ? '—' : data.totals[stat.key].toLocaleString('en-GB')}
              </p>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        }
      </div>

      <Card className="gap-3">
        <CardContent className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">{"Traffic over time"}</h2>
          <p className="text-xs text-muted-foreground">{ranges[range].label}</p>
        </CardContent>
        <CardContent>
          @if (data === undefined) {
            <div className="h-56 animate-pulse rounded-md bg-muted" />
          } @else if (data.totals.events === 0) {
            <div className="flex h-56 items-center justify-center">
              <p className="max-w-sm text-center text-sm text-pretty text-muted-foreground">
                {"Nothing recorded yet. Mount the analytics route in your app and traffic appears here within seconds."}
              </p>
            </div>
          } @else {
            <TrafficChart points={data.timeseries} interval={data.interval} />
          }
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        @for (const panel of breakdownPanels; key panel.dimension) {
          <BreakdownCard
            title={panel.title}
            rows={data === undefined ? [] : data.breakdowns[panel.dimension]}
            empty={data === undefined ? 'Loading…' : panel.empty}
            icon={panel.icon}
          />
        }
      </div>
    </div>
  </div>
}
