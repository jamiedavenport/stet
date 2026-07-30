import { ArrowRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import type { Icon } from '@phosphor-icons/react';

import { rivals } from '#/marketing/data/rivals';
import { RivalLogo } from '#/marketing/sections/rival-logo.tsrx';

/** One destination on an index page. */
export type LinkCard = {
  key: string;
  to: LinkProps['to'];
  params?: LinkProps['params'];
  icon?: Icon;
  /** A company's own mark, where the card is about someone else's product. */
  logoDomain?: string;
  title: string;
  /** The strapline under the title. Cards without one show the arrow alone. */
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
          className="group/card flex flex-1 flex-col rounded-xl p-6 ring-1 ring-foreground/10 hover:bg-muted/40"
        >
          @if (item.icon !== undefined) {
            <item.icon weight="duotone" className="size-6 shrink-0 text-foreground" />
          }
          @if (item.logoDomain !== undefined) {
            <RivalLogo domain={item.logoDomain} />
          }
          <p className="mt-4 text-lg font-medium">{item.title}</p>
          <p className="mt-2 text-base/7 text-pretty text-muted-foreground">{item.description}</p>
          <span className="mt-auto flex pt-6">
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground group-hover/card:text-foreground" />
          </span>
        </Link>
      </li>
    }
  </ul>
}

function rivalCards(except: string | undefined): LinkCard[] {
  return rivals
    .filter((rival) => rival.slug !== except)
    .map((rival) => ({
      key: rival.slug,
      to: '/compare/$rival' as const,
      params: { rival: rival.slug },
      logoDomain: rival.domain,
      title: `Stet vs ${rival.name}`,
      description: rival.tagline,
    }));
}

/** Every comparison as a card, minus the one currently being read. */
export function RivalCards({ except }: { except?: string }) @{
  <LinkCards items={rivalCards(except)} />
}
