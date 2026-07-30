import { Button } from '@repo/ui/components/button';

import type { Showcase as ShowcaseData } from '#/marketing/mockups';

/**
 * A mockup at full width with the line that explains it. The caption carries
 * the meaning, because the mockup itself is hidden from assistive technology.
 */
export function Showcase({ showcase }: { showcase: ShowcaseData }) @{
  <section className="border-t border-border">
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
      <showcase.render />
      <p className="mt-6 max-w-[56ch] text-base/7 text-pretty text-muted-foreground">
        {showcase.caption}
      </p>
      @if (showcase.link !== undefined) {
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          className="mt-8"
          render={<a href={showcase.link.href} target="_blank" rel="noreferrer" />}
        >
          {showcase.link.label}
        </Button>
      }
    </div>
  </section>
}
