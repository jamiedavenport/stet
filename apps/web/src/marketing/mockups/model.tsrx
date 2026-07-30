import {
  ArrowsLeftRightIcon,
  CalendarBlankIcon,
  CaretCircleDownIcon,
  CheckSquareIcon,
  HashIcon,
  ImageIcon,
  LinkIcon,
  ListChecksIcon,
  PlusIcon,
  TextAaIcon,
  TextAlignLeftIcon,
  TreeStructureIcon,
  UserIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@repo/ui/lib/utils';

import { MockPanel } from '#/marketing/mockups/frame.tsrx';
import { fieldTones, people, statuses } from '#/marketing/mockups/palette';
import type { FieldTone } from '#/marketing/mockups/palette';

// Adding a field is picking its type from a menu. The list is the product's
// own `fieldTypeLabels`, in the order the schema declares them.

type FieldTypeRow = { icon: Icon; label: string; hint: string; tone: FieldTone };

const fieldTypes: FieldTypeRow[] = [
  { icon: TextAaIcon, label: 'Text', hint: 'A single line', tone: 'text' },
  { icon: TextAlignLeftIcon, label: 'Rich text', hint: 'A body, edited together', tone: 'text' },
  { icon: HashIcon, label: 'Number', hint: 'Whole or decimal', tone: 'value' },
  { icon: CheckSquareIcon, label: 'Checkbox', hint: 'True or false', tone: 'value' },
  { icon: CalendarBlankIcon, label: 'Date', hint: 'A day, with no timezone', tone: 'value' },
  { icon: CaretCircleDownIcon, label: 'Select', hint: 'One of your options', tone: 'choice' },
  { icon: ListChecksIcon, label: 'Multi-select', hint: 'Any of your options', tone: 'choice' },
  { icon: LinkIcon, label: 'Link', hint: 'A validated URL', tone: 'value' },
  { icon: UserIcon, label: 'Person', hint: 'Someone on the team', tone: 'relation' },
  { icon: ImageIcon, label: 'Asset', hint: 'From your media library', tone: 'relation' },
  { icon: ArrowsLeftRightIcon, label: 'Reference', hint: 'One entry elsewhere', tone: 'relation' },
  { icon: TreeStructureIcon, label: 'Multi-reference', hint: 'Many entries', tone: 'relation' },
];

const existingColumns = ['Title', 'Status', 'Author'];

// The menu opens over a real collection rather than an empty panel: the
// point of the mockup is that a field is a column on something.
const existingRows = [
  { title: 'Both teams at full speed', status: statuses.live, author: people.rae },
  { title: 'Modelling content without a ticket', status: statuses.live, author: people.ade },
  { title: 'What a typed client buys you', status: statuses.review, author: people.rae },
  { title: 'Analytics that sit next to the words', status: statuses.draft, author: people.mira },
  { title: 'Cookieless, and still worth reading', status: statuses.scheduled, author: people.mira },
  { title: 'Deprecations instead of red builds', status: statuses.live, author: people.ade },
  { title: 'What we mean by owning the model', status: statuses.review, author: people.mira },
  { title: 'A field is a column, and nothing more', status: statuses.draft, author: people.rae },
  { title: 'Every entry brings its own numbers', status: statuses.live, author: people.ade },
  { title: 'Writing together without stepping on toes', status: statuses.draft, author: people.rae },
];

/**
 * The field menu open over a collection's table header: twelve types, each
 * one a column marketing can add without waiting on a deploy.
 */
export function FieldTypeMockup() @{
  <MockPanel className="relative p-0">
    <table className="w-full text-sm">
      <thead>
        <tr className="h-10 border-b border-border text-left text-muted-foreground">
          @for (const column of existingColumns; index i; key column) {
            <th className={cn('font-medium', i === 0 ? 'w-1/2 pl-5' : 'px-3')}>{column}</th>
          }
          <th className="w-12 pr-5">
            <span className="flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
              <PlusIcon className="size-4" />
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        @for (const row of existingRows; key row.title) {
          <tr className="h-11 border-b border-border">
            <td className="max-w-0 truncate pl-5 font-medium">{row.title}</td>
            <td className="px-3 whitespace-nowrap">
              <span
                className={cn(
                  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                  row.status.tone,
                )}
              >
                {row.status.label}
              </span>
            </td>
            <td className="max-w-0 truncate px-3 text-muted-foreground">{row.author.name}</td>
            <td className="w-12 pr-5" />
          </tr>
        }
      </tbody>
    </table>
    {/* Anchored under the plus in the header, because the menu belongs to
        that control rather than to the page. */}
    <div className="absolute top-12 right-4 w-72 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-foreground/10 dark:shadow-none">
      <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">New field</p>
      <div className="flex flex-col">
        @for (const type of fieldTypes; index i; key type.label) {
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm',
              i === 1 ? 'bg-accent' : undefined,
            )}
          >
            <type.icon className={cn('size-4 shrink-0', fieldTones[type.tone])} />
            <span className="min-w-0 flex-1 truncate">{type.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground @max-sm:hidden">
              {type.hint}
            </span>
          </div>
        }
      </div>
    </div>
  </MockPanel>
}
