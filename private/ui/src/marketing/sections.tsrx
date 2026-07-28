import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';

import { LabeledSection } from './section.tsrx';
import { TermRows } from './lists.tsrx';
import { ArrowLink, BodyText } from './ui.tsrx';
import { engineerPoints } from './data';

export function ForEngineers() @{
  <LabeledSection title={m.marketing_section_engineers()}>
    <BodyText>{m.marketing_engineers_body()}</BodyText>
    <TermRows rows={engineerPoints()} className="mt-10" />
  </LabeledSection>
}

export function CtaSection() @{
  <LabeledSection title={m.marketing_section_get_started()}>
    <BodyText>{m.marketing_cta_body({ brandName: brand.name })}</BodyText>
    <p className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
      <a href={`mailto:${brand.email}`} className="hover:underline">
        {brand.email}
      </a>
    </p>
    <p className="mt-6 text-sm">
      <ArrowLink href={brand.repository}>{m.marketing_cta_github()}</ArrowLink>
    </p>
  </LabeledSection>
}
