import { cn } from '@repo/ui/lib/utils';
import { PlusIcon } from '@phosphor-icons/react';

import { MockCrumbs, MockShell, MockTypeHeader } from '#/marketing/mockups/frame.tsrx';
import { people, statuses } from '#/marketing/mockups/palette';
import type { Person, Status } from '#/marketing/mockups/palette';

// The collection page: rows are entries, columns are the fields marketing
// added. Two seats are in the room, so one cell carries someone else's caret.

type Row = {
  title: string;
  status: Status;
  author: Person;
  published: string;
  /** The editor whose caret sits in this row's title, if any. */
  heldBy?: Person;
};

const rows: Row[] = [
  {
    title: 'Both teams at full speed',
    status: statuses.live,
    author: people.rae,
    published: '12 Jun 2026',
  },
  {
    title: 'Modelling content without a ticket',
    status: statuses.live,
    author: people.ade,
    published: '28 May 2026',
  },
  {
    title: 'What a typed client buys you',
    status: statuses.review,
    author: people.rae,
    published: '—',
    heldBy: people.ade,
  },
  {
    title: 'Analytics that sit next to the words',
    status: statuses.draft,
    author: people.mira,
    published: '—',
  },
  {
    title: 'Cookieless, and still worth reading',
    status: statuses.scheduled,
    author: people.mira,
    published: '04 Aug 2026',
  },
  {
    title: 'Deprecations instead of red builds',
    status: statuses.live,
    author: people.ade,
    published: '19 May 2026',
  },
  {
    title: 'What we mean by owning the model',
    status: statuses.review,
    author: people.mira,
    published: '—',
  },
  {
    title: 'A field is a column, and nothing more',
    status: statuses.draft,
    author: people.rae,
    published: '—',
  },
];

const columns = ['Title', 'Status', 'Author', 'Published'];

function StatusChip({ status }: { status: Status }) @{
  <span
    className={cn(
      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
      status.tone,
    )}
  >
    {status.label}
  </span>
}

function PersonCell({ person }: { person: Person }) @{
  <span className="flex items-center gap-2">
    <span
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-medium',
        person.solid,
      )}
    >
      {person.initials}
    </span>
    <span className="truncate">{person.name}</span>
  </span>
}

// The name flag hangs off the top-left of the outline rather than the
// top-right, because a caret is read from where it starts and the right edge
// of a truncated title moves with the column.
function HeldCell({ title, by }: { title: string; by: Person }) @{
  <span className="relative flex items-center">
    <span className={cn('absolute -inset-x-2 -inset-y-1.5 rounded-md ring-2', by.ring)}>
      <span
        className={cn(
          'absolute bottom-full left-0 mb-1 rounded-sm px-1 py-0.5 text-[0.625rem] font-medium',
          by.solid,
        )}
      >
        {by.short}
      </span>
    </span>
    <span className={cn('relative truncate rounded-xs font-medium', by.wash)}>{title}</span>
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
                  // Titles are the reason to look at the table, so the column
                  // takes the slack rather than splitting it four ways.
                  i === 0 ? 'w-1/2 pl-6' : 'px-2',
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
