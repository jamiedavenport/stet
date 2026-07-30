import type { MarketingNavLink } from '@repo/ui/marketing/nav.ts';

import { features } from '#/marketing/data/features';
import { personas } from '#/marketing/data/personas';
import { rivals } from '#/marketing/data/rivals';

// The header and footer live in `@repo/ui`, which cannot reach this app's
// copy. These are the two lists they take as props.

/** The header's Features menu, which opens onto the four feature pages. */
export const featureNav: MarketingNavLink[] = features.map((feature) => ({
  label: feature.name,
  description: feature.tagline,
  to: '/features/$slug' as const,
  params: { slug: feature.slug },
}));

/** The header's "Who it is for" menu. */
export const personaNav: MarketingNavLink[] = personas.map((persona) => ({
  label: persona.nav,
  description: persona.tagline,
  to: '/for/$persona' as const,
  params: { persona: persona.slug },
}));

/** Every comparison, listed in full in the footer. */
export const comparisonNav: MarketingNavLink[] = rivals.map((rival) => ({
  label: `Stet vs ${rival.name}`,
  to: '/compare/$rival' as const,
  params: { rival: rival.slug },
}));
