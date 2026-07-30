import { brand } from '@repo/brand';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { TermRows } from '@repo/ui/marketing/lists.tsrx';
import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { findFeature } from '#/marketing/data/features';
import { featureIcons } from '#/marketing/data/icons';
import { findPersona } from '#/marketing/data/personas';
import type { Persona } from '#/marketing/data/personas';
import { featureShowcases } from '#/marketing/mockups';
import { Band, MarketingCta } from '#/marketing/sections/bands.tsrx';
import { LinkCards } from '#/marketing/sections/cards.tsrx';
import { Showcase } from '#/marketing/sections/showcase.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/for/$persona')({
  loader: ({ params }) => {
    const persona = findPersona(params.persona);
    if (persona === undefined) {
      throw notFound();
    }
    return { persona };
  },
  head: ({ loaderData }) =>
    loaderData
      ? seo({
          title: `For ${loaderData.persona.name} · ${brand.name}`,
          description: loaderData.persona.lede,
          path: `/for/${loaderData.persona.slug}`,
        })
      : {},
  component: PersonaPage,
});

/** The feature pages this persona is pointed at, in the order they list them. */
function featureCards(persona: Persona) {
  return persona.features
    .map((slug) => findFeature(slug))
    .filter((feature) => feature !== undefined)
    .map((feature) => ({
      key: feature.slug,
      to: '/features/$slug' as const,
      params: { slug: feature.slug },
      icon: featureIcons[feature.slug],
      title: feature.name,
      description: feature.tagline,
    }));
}

function PersonaPage() {
  const { persona } = Route.useLoaderData();
  const lead = featureShowcases[persona.features[0] ?? 'content'][0];

  return (
    <>
      <PageIntro eyebrow={`For ${persona.name}`} title={persona.title} lede={persona.lede} />
      {lead === undefined ? null : <Showcase showcase={lead} />}
      <Band title="What changes.">
        <TermRows rows={persona.points} />
      </Band>
      <Band
        title="The parts you will live in."
        lede="Everything is on every plan, but these are the ones that will matter to you first."
      >
        <LinkCards items={featureCards(persona)} />
      </Band>
      <MarketingCta />
    </>
  );
}
