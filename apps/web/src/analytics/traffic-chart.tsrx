import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@repo/ui/components/chart';
import type { ChartConfig } from '@repo/ui/components/chart';
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts';

import type { Interval } from '@repo/analytics';

const config = {
  views: { label: 'Views', color: 'var(--chart-1)' },
  visitors: { label: 'Visitors', color: 'var(--chart-2)' },
} satisfies ChartConfig;

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

type TrafficChartProps = {
  /** Counts for each UTC-aligned time bucket. */
  points: { bucket: number; views: number; visitors: number }[];
  /** Granularity used to format each bucket label. */
  interval: Interval;
};

/** Plots page views and distinct visitors on the same time-series chart. */
export function TrafficChart({ points, interval }: TrafficChartProps) @{
  const data = points.map((point) => ({
    label: formatBucket(point.bucket, interval),
    views: point.views,
    visitors: point.visitors,
  }));

  <div className="flex flex-col gap-3">
    <ul
      aria-label="Traffic series"
      className="flex justify-end gap-4 text-xs text-muted-foreground"
    >
      @for (const [key, item] of Object.entries(config); key key) {
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px]" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      }
    </ul>
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
        <ChartTooltip
          cursor={{ stroke: 'var(--chart-grid)' }}
          content={<ChartTooltipContent />}
        />
        <Area
          dataKey="views"
          type="monotone"
          stroke="var(--color-views)"
          strokeWidth={2}
          strokeLinecap="round"
          fill="var(--color-views)"
          fillOpacity={0.12}
          isAnimationActive={false}
          activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
        />
        <Line
          dataKey="visitors"
          type="monotone"
          stroke="var(--color-visitors)"
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 4, stroke: 'var(--card)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  </div>
}
