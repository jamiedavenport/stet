import type { ReactNode } from 'react';
import { brand } from '@repo/brand';
import { ArrowLink } from '@repo/ui/marketing/ui.tsrx';

import { MarketingActions } from '#/marketing/sections/actions.tsrx';

/** A titled band with a lede, used to open the stacked sections on a page. */
export function Band({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: ReactNode;
}) @{
  <section className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <h2 className="max-w-[35ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      @if (lede !== undefined) {
        <p className="mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">{lede}</p>
      }
      @if (children !== undefined) {
        <div className="mt-12">{children}</div>
      }
    </div>
  </section>
}

const promises = [
  {
    term: 'Marketing owns the model.',
    detail:
      'New collections, maps and fields in the interface, without a ticket and without a wait for the next release.',
  },
  {
    term: 'Engineering gets a contract.',
    detail:
      'A generated client that autocompletes the model marketing built and type-checks it at build time.',
  },
  {
    term: 'Nothing breaks across the gap.',
    detail:
      'Changes cross as information, never as breakage. A deleted field becomes a deprecation, not a failed build, and each team migrates on its own schedule.',
  },
];

/** The whole argument, in three lines, immediately under the hero. */
export function TheGap() @{
  <section className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <h2 className="max-w-[35ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Every CMS makes one side compromise.
      </h2>
      <p className="mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">
        Developer-first tools bury content teams in JSON and Git. Marketer-first tools hand
        engineers an untyped API and a prayer. The gap between the two is the whole job.
      </p>
      <dl className="mt-16 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3">
        @for (const promise of promises; key promise.term) {
          <div>
            <dt className="text-lg font-medium text-balance">{promise.term}</dt>
            <dd className="mt-3 text-base/7 text-pretty text-muted-foreground">
              {promise.detail}
            </dd>
          </div>
        }
      </dl>
    </div>
  </section>
}

/**
 * The closing band. `emphasis` stays secondary on any page whose hero
 * already spent the one filled button.
 */
export function MarketingCta({ emphasis = 'primary' }: { emphasis?: 'primary' | 'secondary' }) @{
  <section className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <h2 className="max-w-[30ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        Stop making one team wait for the other.
      </h2>
      <p className="mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">
        Model your first collection in a couple of minutes, or have us walk you through it first.
      </p>
      <MarketingActions emphasis={emphasis} className="mt-10" />
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-base">
        <p>
          <ArrowLink to="/pricing">See what it costs</ArrowLink>
        </p>
        <p>
          <ArrowLink href={brand.docs}>Read the docs</ArrowLink>
        </p>
      </div>
    </div>
  </section>
}
