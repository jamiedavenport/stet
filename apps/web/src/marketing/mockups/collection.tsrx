import { cn } from '@repo/ui/lib/utils';
import { PlusIcon } from '@phosphor-icons/react';

import { MockCrumbs, MockShell, MockTypeHeader } from '#/marketing/mockups/frame.tsrx';

// The collection page: rows are entries, columns are the fields marketing
// added. Two seats are in the room, so one cell carries someone else's caret.

type Row = {
  title: string;
  status: { label: string; tone: string };
  author: { name: string; initials: string };
  published: string;
  /** The editor whose caret sits in this row's title, if any. */
  heldBy?: string;
};

const draft = { label: 'Draft', tone: 'bg-muted text-muted-foreground' };
const review = { label: 'In review', tone: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300' };
const live = { label: 'Live', tone: 'bg-green-500/15 text-green-700 dark:text-green-300' };

const rows: Row[] = [
  {
    title: 'Both teams at full speed',
    status: live,
    author: { name: 'Rae Suzuki', initials: 'RS' },
    published: '12 Jun 2026',
  },
  {
    title: 'Modelling content without a ticket',
    status: live,
    author: { name: 'Ade Okonjo', initials: 'AO' },
    published: '28 May 2026',
  },
  {
    title: 'What a typed client buys you',
    status: review,
    author: { name: 'Rae Suzuki', initials: 'RS' },
    published: '—',
    heldBy: 'Ade',
  },
  {
    title: 'Analytics that sit next to the words',
    status: draft,
    author: { name: 'Mira Halvorsen', initials: 'MH' },
    published: '—',
  },
];

const columns = ['Title', 'Status', 'Author', 'Published'];

function StatusChip({ status }: { status: { label: string; tone: string } }) @{
  <span
    className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
      status.tone,
    )}
  >
    {status.label}
  </span>
}

function PersonCell({ person }: { person: { name: string; initials: string } }) @{
  <span className="flex items-center gap-2">
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.625rem] font-medium">
      {person.initials}
    </span>
    <span className="truncate">{person.name}</span>
  </span>
}

/** A second editor's caret, drawn on the cell they have open. */
function HeldCell({ title, by }: { title: string; by: string }) @{
  <span className="relative flex items-center">
    <span className="absolute -inset-x-2 -inset-y-2 rounded-md ring-2 ring-chart-1" />
    <span className="relative truncate">{title}</span>
    <span className="absolute -top-4.5 -right-2 rounded-sm bg-chart-1 px-1 py-0.5 text-[0.625rem] font-medium text-white">
      {by}
    </span>
  </span>
}

/**
 * The collection page as the product renders it: an editable table over the
 * fields marketing added, with another seat's caret live in it.
 */
export function CollectionMockup() @{
  <MockShell>
    <MockCrumbs trail={['Content', 'Posts']} />
    <div className="flex min-w-0 flex-1 flex-col pt-6">
      <MockTypeHeader name="Posts" slug="posts" />
      <table className="w-full caption-bottom text-sm">
        <thead className="[&_tr]:border-b">
          <tr className="border-b border-border">
            @for (const column of columns; index i; key column) {
              <th
                className={cn(
                  'h-10 text-left align-middle font-medium text-muted-foreground whitespace-nowrap',
                  i === 0 ? 'pl-6' : 'px-2',
                  i > 1 ? '@max-xl:hidden' : undefined,
                )}
              >
                {column}
              </th>
            }
            <th className="h-10 w-10 pr-6 text-left align-middle">
              <PlusIcon className="size-4 text-muted-foreground" />
            </th>
          </tr>
        </thead>
        <tbody>
          @for (const row of rows; key row.title) {
            <tr className="h-12 border-b border-border">
              <td className="max-w-0 py-0 pl-6 align-middle">
                @if (row.heldBy === undefined) {
                  <span className="block truncate font-medium">{row.title}</span>
                } @else {
                  <HeldCell title={row.title} by={row.heldBy} />
                }
              </td>
              <td className="px-2 py-0 align-middle whitespace-nowrap">
                <StatusChip status={row.status} />
              </td>
              <td className="max-w-0 px-2 py-0 align-middle text-muted-foreground @max-xl:hidden">
                <PersonCell person={row.author} />
              </td>
              <td className="px-2 py-0 align-middle whitespace-nowrap text-muted-foreground @max-xl:hidden">
                {row.published}
              </td>
              <td className="w-10 pr-6" />
            </tr>
          }
        </tbody>
      </table>
      <div className="flex h-11 items-center gap-2 border-b border-border px-6 text-sm text-muted-foreground">
        <PlusIcon className="size-4 shrink-0" />
        New entry
      </div>
    </div>
  </MockShell>
}
