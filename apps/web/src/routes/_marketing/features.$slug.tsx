import { brand } from '@repo/brand';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { TermRows } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { findFeature } from '#/marketing/data/features';
import type { FeatureSlug } from '#/marketing/data/features';
import { personaIcons } from '#/marketing/data/icons';
import { personas } from '#/marketing/data/personas';
import { featureShowcases } from '#/marketing/mockups';
import { Band, MarketingCta } from '#/marketing/sections/bands.tsrx';
import { LinkCards } from '#/marketing/sections/cards.tsrx';
import { Showcase } from '#/marketing/sections/showcase.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/features/$slug')({
  loader: ({ params }) => {
    const feature = findFeature(params.slug);
    if (feature === undefined) {
      throw notFound();
    }
    return { feature };
  },
  head: ({ loaderData }) =>
    loaderData
      ? seo({
          title: `${loaderData.feature.name} · ${brand.name}`,
          description: loaderData.feature.lede,
          path: `/features/${loaderData.feature.slug}`,
        })
      : {},
  component: FeaturePage,
});

/** The personas that name this feature as one of the ones they care about. */
function relatedPersonaCards(slug: FeatureSlug) {
  return personas
    .filter((persona) => persona.features.includes(slug))
    .map((persona) => ({
      key: persona.slug,
      to: '/for/$persona' as const,
      params: { persona: persona.slug },
      icon: personaIcons[persona.slug],
      title: `For ${persona.name}`,
      description: persona.tagline,
    }));
}

function FeaturePage() {
  const { feature } = Route.useLoaderData();
  const [lead, ...rest] = featureShowcases[feature.slug];

  return (
    <>
      <PageIntro eyebrow="Features" title={feature.title} lede={feature.lede} />
      {lead === undefined ? null : <Showcase showcase={lead} />}
      <Band title="How it works.">
        <TermRows rows={feature.points} />
      </Band>
      {rest.map((showcase) => (
        <Showcase key={showcase.key} showcase={showcase} />
      ))}
      <Band
        title="Who this matters to."
        lede="The same feature, described from the side of the gap you happen to be standing on."
      >
        <LinkCards items={relatedPersonaCards(feature.slug)} />
      </Band>
      <MarketingCta />
    </>
  );
}
