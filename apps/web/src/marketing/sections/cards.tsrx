import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import type { Icon } from '@phosphor-icons/react';

/** One destination on an index page. */
export type LinkCard = {
  key: string;
  to: LinkProps['to'];
  params?: LinkProps['params'];
  icon?: Icon;
  title: string;
  description: string;
};

/**
 * A grid of cards that each navigate somewhere. Cards are the right surface
 * here precisely because every one of them is a link.
 */
export function LinkCards({ items, columns = 3 }: { items: LinkCard[]; columns?: 2 | 3 }) @{
  <ul
    role="list"
    className={
      columns === 2
        ? 'grid grid-cols-1 gap-8 sm:grid-cols-2'
        : 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3'
    }
  >
    @for (const item of items; key item.key) {
      <li className="flex">
        <Link
          to={item.to}
          params={item.params}
          className="flex flex-1 flex-col rounded-xl p-6 ring-1 ring-foreground/10 hover:bg-muted/40"
        >
          @if (item.icon !== undefined) {
            <item.icon weight="duotone" className="size-6 shrink-0 text-foreground" />
          }
          <p className="mt-4 text-lg font-medium">{item.title}</p>
          <p className="mt-2 text-base/7 text-pretty text-muted-foreground">{item.description}</p>
        </Link>
      </li>
    }
  </ul>
}
