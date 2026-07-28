import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { HeroSplit } from '@repo/ui/marketing/hero.tsrx';
import { FeatureGrid } from '@repo/ui/marketing/lists.tsrx';
import { LabeledSection } from '@repo/ui/marketing/section.tsrx';
import { CtaSection, ForEngineers } from '@repo/ui/marketing/sections.tsrx';
import { contentFeatures } from '@repo/ui/marketing/data';
import { organizationJsonLd, seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/')({
  head: () => ({
    ...seo({
      title: `${brand.name} · ${brand.description}`,
      description:
        'The CMS that refuses the marketing-vs-engineering trade-off: marketing owns the content model, engineering gets a typed client generated from it, and nothing breaks between them.',
      path: '/',
    }),
    scripts: [organizationJsonLd()],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <HeroSplit />
      <LabeledSection title={'For content teams'}>
        <FeatureGrid items={contentFeatures} />
      </LabeledSection>
      <ForEngineers />
      <CtaSection />
    </>
  );
}
