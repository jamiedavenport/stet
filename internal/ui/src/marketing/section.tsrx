import { DisplayHeading, Label, Lede } from './ui.tsrx';

/** Intro band at the top of secondary marketing pages. */
export function PageIntro({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) @{
  <section className="border-b border-border">
    <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 sm:pt-20 sm:pb-16 lg:px-8">
      <Label>{eyebrow}</Label>
      <DisplayHeading as="h1" className="mt-4 max-w-[24ch] text-4xl sm:text-5xl">
        {title}
      </DisplayHeading>
      @if (lede) {
        <Lede className="mt-6">{lede}</Lede>
      }
    </div>
  </section>
}
