import { BrandMark } from '@repo/brand/mark';
import { cn } from '@repo/ui/lib/utils';
import {
  ChartBarIcon,
  CloudIcon,
  CodeIcon,
  CurrencyDollarIcon,
  ShapesIcon,
  SparkleIcon,
  WarningDiamondIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { axes, stetAnswers } from '#/marketing/data/compare';
import type { AxisId, Rival } from '#/marketing/data/compare';
import { RivalLogo } from '#/marketing/sections/rival-logo.tsrx';

// A real table, because this is genuinely tabular. Below `md` each row
// becomes a stack, and the column headers move into the cells so a phone
// still knows which answer belongs to which product.

// Icons are components, so they are kept out of the copy data that the
// dynamic route hands to the client, and joined on here.
const axisIcons: Record<AxisId, Icon> = {
  modelling: ShapesIcon,
  types: CodeIcon,
  change: WarningDiamondIcon,
  analytics: ChartBarIcon,
  ai: SparkleIcon,
  hosting: CloudIcon,
  pricing: CurrencyDollarIcon,
};

const rows = axes.map((axis) => ({ ...axis, icon: axisIcons[axis.id] }));

// Our own column is tinted and set at full contrast. Seven paragraphs of
// grey with nothing to land on is the reason the plain version reads as a
// wall rather than as a comparison.
const ourColumn = 'bg-muted/50 text-foreground';

function CellLabel({ children }: { children: string }) @{
  <p className="pb-1 text-sm font-medium text-foreground md:hidden">{children}</p>
}

/** The seven shared questions, answered by Stet and by one rival. */
export function CompareTable({ rival }: { rival: Rival }) @{
  <table className="w-full text-left">
    <thead className="max-md:sr-only">
      <tr>
        <th className="w-64 pr-8 pb-3 align-bottom">
          <span className="sr-only">Question</span>
        </th>
        <th className={cn('rounded-t-lg px-5 pt-4 pb-3 align-bottom', ourColumn)}>
          <span className="flex items-center gap-2 text-base font-medium whitespace-nowrap">
            <BrandMark className="w-4 shrink-0" />
            Stet
          </span>
        </th>
        <th className="px-5 pb-3 align-bottom">
          <span className="flex items-center gap-2 text-base font-medium whitespace-nowrap">
            <RivalLogo domain={rival.domain} className="size-4 rounded-xs" />
            {rival.name}
          </span>
        </th>
      </tr>
    </thead>
    <tbody>
      @for (const row of rows; index i; key row.id) {
        <tr className="align-top max-md:grid max-md:gap-4 max-md:border-b max-md:border-border max-md:py-6">
          <th
            scope="row"
            className="border-t border-border py-6 pr-8 max-md:border-0 max-md:p-0 md:whitespace-normal"
          >
            <span className="flex items-start gap-2.5 text-base font-medium text-pretty">
              <row.icon className="size-4 h-lh shrink-0 text-muted-foreground" />
              {row.question}
            </span>
          </th>
          <td
            className={cn(
              'border-t border-border px-5 py-6 text-base/7 text-pretty max-md:rounded-lg max-md:border-0 max-md:p-4',
              i === rows.length - 1 ? 'rounded-b-lg' : undefined,
              ourColumn,
            )}
          >
            <CellLabel>Stet</CellLabel>
            {stetAnswers[row.id]}
          </td>
          <td className="max-w-[46ch] border-t border-border px-5 py-6 text-base/7 text-pretty text-muted-foreground max-md:border-0 max-md:p-0">
            <CellLabel>{rival.name}</CellLabel>
            {rival.theirs[row.id]}
          </td>
        </tr>
      }
    </tbody>
  </table>
}
