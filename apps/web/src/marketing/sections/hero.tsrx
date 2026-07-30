import { brand } from '@repo/brand';
import { GithubLogoIcon } from '@phosphor-icons/react';

import { MarketingActions } from '#/marketing/sections/actions.tsrx';
import { CollectionMockup } from '#/marketing/mockups/collection.tsrx';

/** The first thing the page says, because it is the thing least assumed. */
function OpenSourceBadge() @{
  <a
    href={brand.repository}
    target="_blank"
    rel="noreferrer"
    className="flex items-center gap-2 rounded-full py-1 pr-3 pl-2 text-sm ring-1 ring-foreground/10 hover:bg-muted"
  >
    <GithubLogoIcon weight="fill" className="size-4 shrink-0" />
    <span className="font-medium whitespace-nowrap">Open source</span>
    <span className="text-muted-foreground max-sm:hidden">Self-host it, or run it on our cloud</span>
  </a>
}

/**
 * The landing hero: the promise in two tones, one short lede, and the
 * product itself immediately underneath rather than a paragraph about it.
 */
export function Hero() @{
  <section>
    <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 sm:pt-24 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <OpenSourceBadge />
        <h1 className="mt-8 max-w-[20ch] text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Both teams at full speed.
          <span className="text-muted-foreground"> Neither waits, nothing breaks.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">
          Marketing owns the content model. Engineering gets a typed client built from it.
        </p>
        <MarketingActions className="mt-10 flex justify-center" />
      </div>
    </div>
    {/* Narrower than the bands below it: at the full container width the app
        frame reads as a letterboxed strip rather than as a screen. */}
    <div className="mx-auto max-w-5xl px-6 pb-16 sm:pb-24 lg:px-8">
      <CollectionMockup />
    </div>
  </section>
}
