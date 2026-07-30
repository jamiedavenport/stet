import type { ReactNode } from 'react';
import { CheckIcon } from '@phosphor-icons/react';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';

import type { Feature } from '#/marketing/data/features';

/**
 * One feature on the landing page: the claim and its evidence on the left,
 * the part of the product that makes it true on the right. The sides never
 * swap, so four of these read as one column of argument.
 */
export function FeatureBand({ feature, mockup }: { feature: Feature; mockup: ReactNode }) @{
  <section className="border-t border-border">
    <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-x-8 gap-y-12 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:px-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{feature.name}</p>
        <h2 className="mt-4 max-w-[35ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {feature.title}
        </h2>
        <p className="mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">
          {feature.lede}
        </p>
        <ul role="list" className="mt-8 flex flex-col gap-2">
          @for (const point of feature.points.slice(0, 3); key point.term) {
            <li className="flex items-start gap-3 text-base/7">
              <CheckIcon weight="bold" className="size-4 h-lh shrink-0 text-foreground" />
              <span>{point.term}</span>
            </li>
          }
        </ul>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          className="mt-10"
          render={<Link to="/features/$slug" params={{ slug: feature.slug }} />}
        >
          {`More on ${feature.name}`}
        </Button>
      </div>
      <div>{mockup}</div>
    </div>
  </section>
}
