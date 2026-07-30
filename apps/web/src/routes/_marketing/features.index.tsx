import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { features } from '#/marketing/data/features';
import { featureIcons } from '#/marketing/data/icons';
import { Band, MarketingCta } from '#/marketing/sections/bands.tsrx';
import { LinkCards } from '#/marketing/sections/cards.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/features/')({
  head: () =>
    seo({
      title: `Features · ${brand.name}`,
      description:
        'Content modelling in the UI, a typed client generated from it, first-party analytics, and an assistant that asks before it writes.',
      path: '/features',
    }),
  component: FeaturesIndexPage,
});

function featureCards() {
  return features.map((feature) => ({
    key: feature.slug,
    to: '/features/$slug' as const,
    params: { slug: feature.slug },
    icon: featureIcons[feature.slug],
    title: feature.name,
    description: feature.tagline,
  }));
}

function FeaturesIndexPage() {
  return (
    <>
      <PageIntro
        eyebrow="Features"
        title="Four things, done properly."
        lede="Stet is not trying to be every tool you own. It closes one gap, and everything here exists because that gap needed closing."
      />
      <Band
        title="What is in the product."
        lede="Each of these is on every plan. There is no tier where the useful half is kept back."
      >
        <LinkCards items={featureCards()} columns={2} />
      </Band>
      <MarketingCta />
    </>
  );
}
