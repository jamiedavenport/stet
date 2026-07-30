import { brand } from '@repo/brand';

import { MarketingActions } from '#/marketing/sections/actions.tsrx';
import { CollectionMockup } from '#/marketing/mockups/collection.tsrx';

/**
 * The landing hero: the promise in two tones, one short lede, and the
 * product itself immediately underneath rather than a paragraph about it.
 */
export function Hero() @{
  <section>
    <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 sm:pt-24 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <p className="text-sm text-muted-foreground">{brand.description}</p>
        <h1 className="mt-6 max-w-[20ch] text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Both teams at full speed.
          <span className="text-muted-foreground"> Neither waits, nothing breaks.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-[48ch] text-lg/8 text-pretty text-muted-foreground">
          Marketing owns the content model. Engineering gets a typed client built from it.
        </p>
        <MarketingActions className="mt-10 flex justify-center" />
      </div>
    </div>
    <div className="mx-auto max-w-7xl px-6 pb-16 sm:pb-24 lg:px-8">
      <CollectionMockup />
    </div>
  </section>
}
