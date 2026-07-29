import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@repo/ui/components/chart';
import type { ChartConfig } from '@repo/ui/components/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import type { Interval } from '@repo/analytics';

// Plain TSX rather than TSRX: Recharts composes through nested elements and
// prop-passed colours, which is what this file is.

// One series, named by the card's own heading, so nothing here encodes
// identity in colour.
const config = { views: { label: 'Views', color: 'var(--chart-1)' } } satisfies ChartConfig;

/**
 * Buckets are UTC-aligned, so they are formatted in UTC too. It also keeps
 * server and client output identical: the Worker renders in UTC, browsers do
 * not, and a mismatch would hydrate as a flicker of shifted labels.
 */
function formatBucket(bucket: number, interval: Interval): string {
  const date = new Date(bucket);
  if (interval === 'hour') {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  }
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function TrafficChart({
  points,
  interval,
}: {
  points: { bucket: number; count: number }[];
  interval: Interval;
}) {
  const data = points.map((point) => ({
    label: formatBucket(point.bucket, interval),
    views: point.count,
  }));

  return (
    <ChartContainer config={config} className="h-56 w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          width={36}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          domain={[0, 'auto']}
        />
        <ChartTooltip cursor={{ stroke: 'var(--chart-grid)' }} content={<ChartTooltipContent />} />
        <Area
          dataKey="views"
          type="monotone"
          stroke="var(--color-views)"
          strokeWidth={2}
          strokeLinecap="round"
          fill="var(--color-views)"
          fillOpacity={0.08}
          isAnimationActive={false}
          activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
