import type { Rival } from '#/marketing/data/compare';
import { hostedRivals } from '#/marketing/data/rivals-hosted';
import { openRivals } from '#/marketing/data/rivals-open';

// Ordered by how often teams are actually choosing between one of these and
// Stet, rather than alphabetically.
const order = [
  'wordpress',
  'sanity',
  'contentful',
  'payload',
  'storyblok',
  'webflow',
  'strapi',
  'prismic',
  'directus',
];

const all = [...openRivals, ...hostedRivals];

/** Every product Stet publishes a comparison against. */
export const rivals: Rival[] = order
  .map((slug) => all.find((rival) => rival.slug === slug))
  .filter((rival): rival is Rival => rival !== undefined);

export function findRival(slug: string): Rival | undefined {
  return rivals.find((rival) => rival.slug === slug);
}
