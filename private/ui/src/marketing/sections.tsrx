import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';

import { LabeledSection } from './section.tsrx';
import { TermRows } from './lists.tsrx';
import { ArrowLink, BodyText, DisplayHeading } from './ui.tsrx';
import { bindings, devLoop, stack } from './data';

export function StackStrip() @{
  <section className="border-t border-border">
    <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-8 gap-y-3 px-6 py-8 lg:px-8">
      <p className="text-sm font-medium text-muted-foreground">{m.marketing_built_on()}</p>
      <ul role="list" className="flex flex-wrap gap-x-6 gap-y-2">
        @for (const name of stack; key name) {
          <li className="text-sm text-muted-foreground">{name}</li>
        }
      </ul>
    </div>
  </section>
}

export function Architecture() @{
  <LabeledSection title={m.marketing_section_architecture()}>
    <BodyText>
      {m.marketing_architecture_body()}
    </BodyText>
    <TermRows rows={bindings()} className="mt-10" />
    <p className="mt-8 text-sm">
      <ArrowLink to="/blog/$slug" params={{ slug: 'one-worker' }}>
        {m.marketing_architecture_link()}
      </ArrowLink>
    </p>
  </LabeledSection>
}

export function DevExperience() @{
  <LabeledSection title={m.marketing_section_workflow()}>
    <BodyText>
      {m.marketing_dev_body()}
    </BodyText>
    <div className="mt-10 max-w-md rounded-xl border border-border bg-muted p-4 font-mono text-sm/6 text-foreground">
      @for (const line of devLoop(); key line.command) {
        <div>
          <p>
            <span aria-hidden="true" className="mr-2 text-muted-foreground">
              $
            </span>
            {line.command}
          </p>
          @if (line.note) {
            <p className="text-muted-foreground"># {line.note}</p>
          }
        </div>
      }
      <p className="text-muted-foreground">➜ http://localhost:3000</p>
    </div>
    <BodyText className="mt-8">
      {m.marketing_dev_testing_body()}
    </BodyText>
  </LabeledSection>
}

export function CtaSection() @{
  <LabeledSection title={m.marketing_section_get_onyx({ brandName: brand.name })}>
    <BodyText>
      {m.marketing_cta_body()}
    </BodyText>
    <p className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
      <a href={`mailto:${brand.email}`} className="hover:underline">
        {brand.email}
      </a>
    </p>
    <p className="mt-6 text-sm">
      <ArrowLink href={brand.docs}>{m.marketing_cta_docs_link()}</ArrowLink>
    </p>
  </LabeledSection>
}
