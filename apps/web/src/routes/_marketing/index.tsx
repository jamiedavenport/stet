import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
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
      description: m.marketing_landing_description(),
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
      <LabeledSection title={m.marketing_section_content_teams()}>
        <FeatureGrid items={contentFeatures()} />
      </LabeledSection>
      <ForEngineers />
      <CtaSection />
    </>
  );
}
