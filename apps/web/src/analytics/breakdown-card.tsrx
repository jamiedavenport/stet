import type { BreakdownRow } from '@repo/analytics';
import { Card, CardContent } from '@repo/ui/components/card';

import { BreakdownRowIcon } from '#/analytics/breakdown-row-icon';

type BreakdownCardProps = {
  title: string;
  rows: readonly BreakdownRow[];
  empty: string;
  icon?: 'country' | 'device';
};

/**
 * A ranked list with the bar drawn behind each row. Magnitude is the bar's
 * width and identity is the row's own label, so the list needs no colour and
 * no legend to be read.
 */
export function BreakdownCard(props: BreakdownCardProps) @{
  const largest = props.rows[0]?.count ?? 0;

  <Card size="sm" className="gap-3">
    <CardContent>
      <h2 className="text-sm font-medium">{props.title}</h2>
    </CardContent>
    <CardContent>
      @if (props.rows.length === 0) {
        <p className="py-6 text-center text-sm text-muted-foreground">{props.empty}</p>
      } @else {
        <ul className="flex flex-col gap-0.5">
          @for (const row of props.rows; key row.key) {
            <li className="relative flex items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm">
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 rounded-sm bg-chart-1/12"
                style={{ width: `${largest === 0 ? 0 : (row.count / largest) * 100}%` }}
              />
              <span className="relative flex min-w-0 items-center gap-2" title={row.key}>
                <BreakdownRowIcon kind={props.icon} value={row.key} />
                <span className="truncate">{row.key}</span>
              </span>
              <span className="relative font-mono text-xs tabular-nums text-muted-foreground">
                {row.count.toLocaleString('en-GB')}
              </span>
            </li>
          }
        </ul>
      }
    </CardContent>
  </Card>
}
