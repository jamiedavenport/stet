import { brand } from '@repo/brand';

import { LabeledSection } from './section.tsrx';
import { TermRows } from './lists.tsrx';
import { ArrowLink, BodyText } from './ui.tsrx';
import { engineerPoints } from './data';

export function ForEngineers() @{
  <LabeledSection title={"For engineers"}>
    <BodyText>{"The content model marketing designs becomes an API your editor autocompletes."}</BodyText>
    <TermRows rows={engineerPoints} className="mt-10" />
  </LabeledSection>
}

export function CtaSection() @{
  <LabeledSection title={"Get started"}>
    <BodyText>{`Sign up and model your first collection, or follow ${brand.name} being built in the open. Questions and ideas are welcome any time.`}</BodyText>
    <p className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
      <a href={`mailto:${brand.email}`} className="hover:underline">
        {brand.email}
      </a>
    </p>
    <p className="mt-6 text-sm">
      <ArrowLink href={brand.repository}>{"Follow along on GitHub"}</ArrowLink>
    </p>
  </LabeledSection>
}
