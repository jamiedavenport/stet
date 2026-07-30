import { brand } from '@repo/brand';
import { defineOgConfig, ignore } from '@jxdltd/tanstack/og';
import type { OgConfigContext } from '@jxdltd/tanstack/og';

import { findPost } from '../src/marketing/content';
import { findFeature } from '../src/marketing/data/features';
import { findPersona } from '../src/marketing/data/personas';
import { findRival } from '../src/marketing/data/rivals';

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
  '/blog/$slug': ({ params }: OgConfigContext<{ slug: string }>) => {
    const post = findPost(params.slug);
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
  '/changelog': () => ({
    title: 'What shipped, when.',
    tag: 'Changelog',
  }),
  '/contact': () => ({
    title: 'One email reaches the engineer.',
    tag: 'Contact',
  }),
});
