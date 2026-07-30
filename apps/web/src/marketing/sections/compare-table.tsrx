import { axes, stetAnswers } from '#/marketing/data/compare';
import type { Rival } from '#/marketing/data/compare';

// A real table, because this is genuinely tabular. Below `md` each row
// becomes a stack, and the column headers move into the cells so a phone
// still knows which answer belongs to which product.

function CellLabel({ children }: { children: string }) @{
  <p className="pb-1 text-sm font-medium text-foreground md:hidden">{children}</p>
}

/** The seven shared questions, answered by Stet and by one rival. */
export function CompareTable({ rival }: { rival: Rival }) @{
  <table className="w-full text-left">
    <thead className="max-md:sr-only">
      <tr className="border-b border-border">
        <th className="w-56 py-3 pr-8 align-bottom text-base font-medium whitespace-nowrap">
          <span className="sr-only">Question</span>
        </th>
        <th className="py-3 pr-8 align-bottom text-base font-medium whitespace-nowrap">Stet</th>
        <th className="py-3 align-bottom text-base font-medium whitespace-nowrap">{rival.name}</th>
      </tr>
    </thead>
    <tbody>
      @for (const axis of axes; key axis.id) {
        <tr className="border-b border-border align-top max-md:grid max-md:gap-4 max-md:py-6">
          <th
            scope="row"
            className="py-5 pr-8 text-base font-medium text-pretty max-md:p-0 md:whitespace-normal"
          >
            {axis.question}
          </th>
          <td className="py-5 pr-8 text-base/7 text-pretty text-muted-foreground max-md:p-0">
            <CellLabel>Stet</CellLabel>
            {stetAnswers[axis.id]}
          </td>
          <td className="py-5 text-base/7 text-pretty text-muted-foreground max-md:p-0">
            <CellLabel>{rival.name}</CellLabel>
            {rival.theirs[axis.id]}
          </td>
        </tr>
      }
    </tbody>
  </table>
}
