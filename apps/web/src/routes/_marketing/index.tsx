import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import { createFileRoute } from '@tanstack/react-router';

import { HeroSplit } from '@repo/ui/marketing/hero.tsrx';
import { FeatureGrid } from '@repo/ui/marketing/lists.tsrx';
import { LabeledSection } from '@repo/ui/marketing/section.tsrx';
import {
  Architecture,
  CtaSection,
  DevExperience,
  StackStrip,
} from '@repo/ui/marketing/sections.tsrx';
import { PricingCards } from '@repo/ui/marketing/pricing.tsrx';
import { BlogTeaser, Faq } from '@repo/ui/marketing/extras.tsrx';
import { features } from '@repo/ui/marketing/data';
import { latestPosts } from '#/marketing/content';
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
      <StackStrip />
      <LabeledSection title={m.marketing_section_features()}>
        <FeatureGrid items={features()} />
      </LabeledSection>
      <Architecture />
      <DevExperience />
      <PricingCards />
      <Faq />
      <BlogTeaser posts={latestPosts(3)} />
      <CtaSection />
    </>
  );
}
