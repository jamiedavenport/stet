import type { ReactNode } from 'react';

import { DisplayHeading, Label, Lede } from './ui.tsrx';

/** A titled content band: a label on the left rail, content on the right. */
export function LabeledSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) @{
  <section id={id} className="scroll-mt-20 border-t border-border">
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-8 px-6 py-16 sm:py-20 lg:grid-cols-[16rem_1fr] lg:px-8">
      <Label as="h2">{title}</Label>
      <div>{children}</div>
    </div>
  </section>
}

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
