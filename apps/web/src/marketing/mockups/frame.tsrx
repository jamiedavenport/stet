import type { ReactNode } from 'react';
import { BrandMark } from '@repo/brand/mark';
import { cn } from '@repo/ui/lib/utils';
import {
  CaretUpDownIcon,
  ChartBarIcon,
  FileTextIcon,
  HouseIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  StackIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

// Every mockup on the marketing site is a reproduction rather than a
// screenshot: same shell, same tokens, same components, so a restyle carries
// them with it and dark mode needs no second asset. They are decorative, so
// each one is hidden from assistive technology and the prose beside it says
// what it shows.

type MockNavItem = { icon: Icon; label: string };

const navGroups: { id: string; label?: string; items: MockNavItem[] }[] = [
  {
    id: 'home',
    items: [
      { icon: HouseIcon, label: 'Home' },
      { icon: MagnifyingGlassIcon, label: 'Search' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { icon: StackIcon, label: 'Posts' },
      { icon: StackIcon, label: 'Authors' },
      { icon: FileTextIcon, label: 'Landing' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { icon: ImageIcon, label: 'Media' },
      { icon: ChartBarIcon, label: 'Analytics' },
    ],
  },
];

function MockSidebarItem({ item, active }: { item: MockNavItem; active: boolean }) @{
  <div
    className={cn(
      'flex h-8 items-center gap-2 rounded-md px-2 text-sm',
      active ? 'bg-sidebar-accent font-medium' : 'text-muted-foreground',
    )}
  >
    <item.icon weight="duotone" className="size-4 shrink-0" />
    <span className="truncate">{item.label}</span>
  </div>
}

/** The inset sidebar: org switcher, grouped navigation, account row. */
function MockSidebar({ active }: { active: string }) @{
  <div className="flex w-52 shrink-0 flex-col gap-4 px-2 py-1 @max-2xl:hidden">
    <div className="flex h-9 items-center gap-2 rounded-md px-2">
      <BrandMark className="size-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">Acme</span>
      <CaretUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </div>
    @for (const group of navGroups; key group.id) {
      <div className="flex flex-col gap-0.5">
        @if (group.label !== undefined) {
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
        }
        @for (const item of group.items; key item.label) {
          <MockSidebarItem item={item} active={item.label === active} />
        }
      </div>
    }
    <div className="mt-auto flex h-9 items-center gap-2 rounded-md px-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.625rem] font-medium">
        RS
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Rae Suzuki</span>
    </div>
  </div>
}

/**
 * The app shell: a gray canvas with the content floating on it as a rounded
 * panel, exactly as `variant="inset"` renders it in the product. `aside`
 * docks a second panel beside the first, where the assistant lives.
 */
export function MockShell({
  active = 'Posts',
  aside,
  children,
}: {
  /** Which sidebar item this screen belongs to. */
  active?: string;
  aside?: ReactNode;
  children: ReactNode;
}) @{
  <div
    aria-hidden="true"
    className="@container overflow-hidden rounded-xl bg-sidebar p-2 ring-1 ring-foreground/10 select-none"
  >
    <div className="flex min-h-96 gap-1">
      <MockSidebar active={active} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-background shadow-sm ring-1 ring-foreground/5 dark:shadow-none">
        {children}
      </div>
      @if (aside !== undefined) {
        <div className="ml-1 flex w-80 shrink-0 flex-col overflow-hidden rounded-lg bg-background shadow-sm ring-1 ring-foreground/5 @max-3xl:hidden dark:shadow-none">
          {aside}
        </div>
      }
    </div>
  </div>
}

/** One floating panel on the canvas, for screens shown without the sidebar. */
export function MockPanel({ className, children }: { className?: string; children: ReactNode }) @{
  <div
    aria-hidden="true"
    className="@container overflow-hidden rounded-xl bg-sidebar p-2 ring-1 ring-foreground/10 select-none"
  >
    <div
      className={cn(
        'overflow-hidden rounded-lg bg-background shadow-sm ring-1 ring-foreground/5 dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  </div>
}

/** The breadcrumb strip every page in the app opens with. */
export function MockCrumbs({ trail }: { trail: string[] }) @{
  <div className="flex h-11 items-center gap-1.5 border-b border-border px-4 text-sm text-muted-foreground">
    @for (const crumb of trail; index i; key crumb) {
      <span className={cn('truncate', i === trail.length - 1 ? 'text-foreground' : undefined)}>
        {i === 0 ? crumb : `/ ${crumb}`}
      </span>
    }
  </div>
}

/** A page title with its slug beside it, as the collection and map pages set. */
export function MockTypeHeader({ name, slug }: { name: string; slug: string }) @{
  <div className="flex items-center gap-3 border-b border-border px-6 pb-5">
    <p className="text-3xl font-semibold tracking-tight">{name}</p>
    <span className="rounded-md px-1.5 py-0.5 font-mono text-sm text-muted-foreground">{slug}</span>
  </div>
}
