import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { PageIntro } from '@repo/ui/marketing/section.tsrx';
import { personaIcons } from '#/marketing/data/icons';
import { personas } from '#/marketing/data/personas';
import { Band, MarketingCta } from '#/marketing/sections/bands.tsrx';
import { LinkCards } from '#/marketing/sections/cards.tsrx';
import { seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/for/')({
  head: () =>
    seo({
      title: `Who Stet is for · ${brand.name}`,
      description:
        'Marketing teams, engineers, agencies, startups and enterprises: the same product, described from the side of the gap you work on.',
      path: '/for',
    }),
  component: PersonaIndexPage,
});

function personaCards() {
  return personas.map((persona) => ({
    key: persona.slug,
    to: '/for/$persona' as const,
    params: { persona: persona.slug },
    icon: personaIcons[persona.slug],
    title: `For ${persona.name}`,
    description: persona.tagline,
  }));
}

function PersonaIndexPage() {
  return (
    <>
      <PageIntro
        eyebrow="Who it is for"
        title="Both teams, and the people who have to sit between them."
        lede="A CMS is bought by one team and lived in by another. These pages describe the same product from each of those positions."
      />
      <Band title="Pick the one that sounds like your week.">
        <LinkCards items={personaCards()} />
      </Band>
      <MarketingCta />
    </>
  );
}
