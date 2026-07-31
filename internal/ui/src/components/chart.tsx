import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '../lib/utils';

// The shadcn chart component, trimmed to what Stet draws: single-series
// charts in a monochrome design, so the legend and icon machinery is absent.
// Series colours come from `--color-<key>`, which ChartStyle writes per theme.

const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [k in string]: { label?: React.ReactNode } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart(): ChartConfig {
  const config = React.useContext(ChartContext);
  if (config === null) {
    throw new Error('useChart must be used within a <ChartContainer />.');
  }
  return config;
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const coloured = Object.entries(config).filter(([, item]) => item.theme ?? item.color);
  if (coloured.length === 0) {
    return null;
  }

  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const declarations = coloured
        .map(([key, item]) => {
          const color = item.theme?.[theme as keyof typeof THEMES] ?? item.color;
          return color === undefined ? null : `  --color-${key}: ${color};`;
        })
        .filter((line) => line !== null)
        .join('\n');
      return `${prefix} [data-chart=${id}] {\n${declarations}\n}`;
    })
    .join('\n');

  // Recharts takes colours as prop values, not classes, so the per-chart
  // custom properties have to reach the DOM as real CSS.
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replaceAll(':', '')}`;

  return (
    <ChartContext.Provider value={config}>
      <div
        data-chart={chartId}
        data-slot="chart"
        className={cn(
          "flex justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipItem = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  hideIndicator = false,
  className,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: React.ReactNode;
  labelFormatter?: (label: unknown) => React.ReactNode;
  formatter?: (value: number | string, name: string) => React.ReactNode;
  hideIndicator?: boolean;
  className?: string;
}) {
  const config = useChart();

  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid min-w-32 items-start gap-1.5 rounded-lg bg-popover px-2.5 py-1.5 text-xs shadow-sm ring-1 ring-foreground/10',
        className,
      )}
    >
      {label == null ? null : (
        <div className="font-medium text-popover-foreground">
          {labelFormatter === undefined ? label : labelFormatter(label)}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? 'value');
          const name = config[key]?.label ?? item.name ?? key;
          return (
            <div key={key + String(index)} className="flex items-center gap-2">
              {hideIndicator ? null : (
                <span
                  className="size-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: item.color ?? `var(--color-${key})` }}
                />
              )}
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
                {formatter === undefined
                  ? Number(item.value).toLocaleString('en-GB')
                  : formatter(item.value ?? 0, key)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
