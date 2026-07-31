import { brand } from '@repo/brand';
import { defineOgConfig, ignore } from '@jxdltd/tanstack/og';
import type { OgConfigContext } from '@jxdltd/tanstack/og';

import { listPosts } from '../src/marketing/posts';
import type { PostSummary } from '../src/marketing/posts';
import { findFeature } from '../src/marketing/data/features';
import { findPersona } from '../src/marketing/data/personas';
import { findRival } from '../src/marketing/data/rivals';

let pending: Promise<PostSummary[]> | undefined;

/**
 * The blog, fetched from Stet once however many images the run renders. A
 * build with no `STET_API_KEY` gets an empty list, and every post card is
 * skipped rather than the build failing.
 */
export function ogPosts(): Promise<PostSummary[]> {
  pending ??= listPosts();
  return pending;
}

export default defineOgConfig({
  '/': () => ({
    title: 'Both teams at full speed.',
    tag: brand.description,
  }),
  '/features/': () => ({
    title: 'Four things, done properly.',
    tag: 'Features',
  }),
  '/features/$slug': ({ params }: OgConfigContext<{ slug: string }>) => {
    const feature = findFeature(params.slug);
    if (feature === undefined) {
      return ignore;
    }
    return { title: feature.title, tag: feature.name };
  },
  '/for/': () => ({
    title: 'Both teams, and the people between them.',
    tag: 'Who it is for',
  }),
  '/for/$persona': ({ params }: OgConfigContext<{ persona: string }>) => {
    const persona = findPersona(params.persona);
    if (persona === undefined) {
      return ignore;
    }
    return { title: persona.title, tag: `For ${persona.name}` };
  },
  '/compare/': () => ({
    title: 'How Stet differs, without the straw men.',
    tag: 'Compare',
  }),
  '/compare/$rival': ({ params }: OgConfigContext<{ rival: string }>) => {
    const rival = findRival(params.rival);
    if (rival === undefined) {
      return ignore;
    }
    return { title: `${brand.name} vs ${rival.name}`, tag: 'Compare' };
  },
  '/pricing': () => ({
    title: 'Ten dollars a person. Everything included.',
    tag: 'Pricing',
  }),
  '/blog/': () => ({
    title: 'Notes from the build.',
    tag: 'Blog',
  }),
  // Annotated because this project is checked without the app's generated
  // route tree, so the router's FileRoutesByPath augmentation is absent.
  '/blog/$slug': async ({ params }: OgConfigContext<{ slug: string }>) => {
    const post = (await ogPosts()).find((candidate) => candidate.slug === params.slug);
    if (post === undefined) {
      return ignore;
    }
    return {
      title: post.title,
      type: 'article',
      author: post.author,
      date: post.date,
      tag: 'Blog',
    };
  },
  '/contact': () => ({
    title: 'One email reaches the engineer.',
    tag: 'Contact',
  }),
});
