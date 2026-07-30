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

// Adding a field is picking its type from a menu. The list is the product's
// own `fieldTypeLabels`, in the order the schema declares them.

type FieldTypeRow = { icon: Icon; label: string; hint: string };

const fieldTypes: FieldTypeRow[] = [
  { icon: TextAaIcon, label: 'Text', hint: 'A single line' },
  { icon: TextAlignLeftIcon, label: 'Rich text', hint: 'A body, edited together' },
  { icon: HashIcon, label: 'Number', hint: 'Whole or decimal' },
  { icon: CheckSquareIcon, label: 'Checkbox', hint: 'True or false' },
  { icon: CalendarBlankIcon, label: 'Date', hint: 'A day, with no timezone' },
  { icon: CaretCircleDownIcon, label: 'Select', hint: 'One of your options' },
  { icon: ListChecksIcon, label: 'Multi-select', hint: 'Any of your options' },
  { icon: LinkIcon, label: 'Link', hint: 'A validated URL' },
  { icon: UserIcon, label: 'Person', hint: 'Someone on the team' },
  { icon: ImageIcon, label: 'Asset', hint: 'From your media library' },
  { icon: ArrowsLeftRightIcon, label: 'Reference', hint: 'One entry elsewhere' },
  { icon: TreeStructureIcon, label: 'Multi-reference', hint: 'Many entries' },
];

const existingColumns = ['Title', 'Status', 'Author'];

/**
 * The field menu open over a collection's table header: twelve types, each
 * one a column marketing can add without waiting on a deploy.
 */
export function FieldTypeMockup() @{
  <MockPanel className="p-0">
    <div className="flex h-10 items-center border-b border-border text-sm text-muted-foreground">
      @for (const column of existingColumns; index i; key column) {
        <span className={i === 0 ? 'pl-5 font-medium' : 'px-3 font-medium @max-sm:hidden'}>
          {column}
        </span>
      }
      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-foreground @max-sm:ml-auto @max-sm:mr-4 @sm:ml-3">
        <PlusIcon className="size-4" />
      </span>
    </div>
    <div className="p-3">
      <div className="w-full max-w-80 rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10 dark:shadow-none">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">New field</p>
        <div className="flex flex-col">
          @for (const type of fieldTypes; index i; key type.label) {
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm',
                i === 1 ? 'bg-accent' : undefined,
              )}
            >
              <type.icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{type.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground @max-sm:hidden">
                {type.hint}
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  </MockPanel>
}
