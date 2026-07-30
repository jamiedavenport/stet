import type { ReactNode } from 'react';
import { brand } from '@repo/brand';
import { Button } from '@repo/ui/components/button';

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

/** Three terms and their details, the shape every argument band takes. */
function Promises({ promises }: { promises: { term: string; detail: string }[] }) @{
  <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-3">
    @for (const promise of promises; key promise.term) {
      <div>
        <dt className="text-lg font-medium text-balance">{promise.term}</dt>
        <dd className="mt-3 text-base/7 text-pretty text-muted-foreground">{promise.detail}</dd>
      </div>
    }
  </dl>
}

const gapPromises = [
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
  <Band
    title="Every CMS makes one side compromise."
    lede="Developer-first tools bury content teams in JSON and Git. Marketer-first tools hand engineers an untyped API and a prayer. The gap between the two is the whole job."
  >
    <Promises promises={gapPromises} />
  </Band>
}

const openPromises = [
  {
    term: 'Read the whole thing.',
    detail:
      'The application, the client, the Vite plugin and the workers behind them are all public. Nothing that decides what happens to your content happens somewhere you cannot look at it.',
  },
  {
    term: 'Self-host it for nothing.',
    detail:
      'Deploy it to your own Cloudflare account and pay us nothing at all. The hosted cloud exists because most teams would rather not run it, not because it is a different product.',
  },
  {
    term: 'Leaving is a supported path.',
    detail:
      'Your content comes out through the same API it went in by, analytics already routes through your own infrastructure, and the content model is a file you can read.',
  },
];

/** Open source is a decision about who is in control, so it argues that way. */
export function OpenSource() @{
  <Band
    title="Open source, and yours to run."
    lede="A CMS holds everything you have written. Being able to take it, host it and read how it works is not a feature we would want to charge for."
  >
    <>
      <Promises promises={openPromises} />
      <Button
        size="lg"
        variant="outline"
        nativeButton={false}
        className="mt-12"
        render={<a href={brand.repository} target="_blank" rel="noreferrer" />}
      >
        See the source on GitHub
      </Button>
    </>
  </Band>
}

/**
 * The closing band: one panel rather than a stack of loose rows, so the last
 * thing on the page reads as an offer. `emphasis` stays secondary on any page
 * whose hero already spent the one filled button.
 */
export function MarketingCta({ emphasis = 'primary' }: { emphasis?: 'primary' | 'secondary' }) @{
  <section className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
      <div className="rounded-xl bg-sidebar px-6 py-12 ring-1 ring-foreground/10 sm:px-12 sm:py-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-[30ch] text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Stop making one team wait for the other.
            </h2>
            <p className="mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">
              Model your first collection in a couple of minutes, or have us walk you through it
              first.
            </p>
          </div>
          <div className="shrink-0">
            <MarketingActions emphasis={emphasis} />
            <p className="mt-4 text-sm text-pretty text-muted-foreground">
              $10 per user per month. Free to self-host.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
}
