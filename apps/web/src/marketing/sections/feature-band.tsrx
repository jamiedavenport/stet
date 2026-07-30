import type { ReactNode } from 'react';
import { CheckIcon } from '@phosphor-icons/react';
import { ArrowLink } from '@repo/ui/marketing/ui.tsrx';

import type { Feature } from '#/marketing/data/features';

/**
 * One feature on the landing page: the claim and its evidence on one side,
 * the part of the product that makes it true on the other.
 */
export function FeatureBand({
  feature,
  mockup,
  reversed = false,
}: {
  feature: Feature;
  mockup: ReactNode;
  reversed?: boolean;
}) @{
  <section className="border-t border-border">
    <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-8 gap-y-12 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:px-8">
      <div className={reversed ? 'lg:order-2' : undefined}>
        <p className="text-sm font-medium text-muted-foreground">{feature.name}</p>
        <h2 className="mt-4 max-w-[35ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {feature.title}
        </h2>
        <p className="mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">
          {feature.lede}
        </p>
        <ul role="list" className="mt-8 flex flex-col gap-3">
          @for (const point of feature.points.slice(0, 3); key point.term) {
            <li className="flex items-baseline gap-3 text-base/7">
              <CheckIcon className="size-4 h-lh shrink-0 text-muted-foreground" />
              <span>{point.term}</span>
            </li>
          }
        </ul>
        <p className="mt-8 text-base">
          <ArrowLink to="/features/$slug" params={{ slug: feature.slug }}>
            {`More on ${feature.name.toLowerCase()}`}
          </ArrowLink>
        </p>
      </div>
      <div className={reversed ? 'lg:order-1' : undefined}>{mockup}</div>
    </div>
  </section>
}
