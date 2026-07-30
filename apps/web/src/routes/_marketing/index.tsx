import { brand } from '@repo/brand';
import { Link, createFileRoute } from '@tanstack/react-router';

import { features } from '#/marketing/data/features';
import { personaIcons } from '#/marketing/data/icons';
import { personas } from '#/marketing/data/personas';
import { rivals } from '#/marketing/data/rivals';
import { landingMockups } from '#/marketing/mockups';
import { Band, MarketingCta, TheGap } from '#/marketing/sections/bands.tsrx';
import { LinkCards } from '#/marketing/sections/cards.tsrx';
import { FeatureBand } from '#/marketing/sections/feature-band.tsrx';
import { Hero } from '#/marketing/sections/hero.tsrx';
import { organizationJsonLd, seo } from '#/marketing/seo';

export const Route = createFileRoute('/_marketing/')({
  head: () => ({
    ...seo({
      title: `${brand.name} · ${brand.description}`,
      description:
        'The CMS that refuses the marketing-versus-engineering trade-off: marketing owns the content model, engineering gets a typed client generated from it, and nothing breaks between them.',
      path: '/',
    }),
    scripts: [organizationJsonLd()],
  }),
  component: LandingPage,
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

function LandingPage() {
  return (
    <>
      <Hero />
      <TheGap />
      {features.map((feature, index) => {
        const Mockup = landingMockups[feature.slug];
        return (
          <FeatureBand
            key={feature.slug}
            feature={feature}
            mockup={<Mockup />}
            reversed={index % 2 === 1}
          />
        );
      })}
      <Band
        title="Built for both sides of the gap."
        lede="The same product, read from whichever side of it you happen to sit on."
      >
        <LinkCards items={personaCards()} />
      </Band>
      <Band
        title="Coming from somewhere else?"
        lede="Honest comparisons against the CMSes teams actually weigh Stet against, including what each of them does better."
      >
        <ul role="list" className="flex flex-wrap gap-x-6 gap-y-3 text-base">
          {rivals.map((rival) => (
            <li key={rival.slug}>
              <Link
                to="/compare/$rival"
                params={{ rival: rival.slug }}
                className="font-medium hover:underline"
              >
                {`Stet vs ${rival.name}`}
              </Link>
            </li>
          ))}
        </ul>
      </Band>
      <MarketingCta emphasis="secondary" />
    </>
  );
}
