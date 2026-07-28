import { brand } from '@repo/brand';
import { defineOgConfig, ignore } from '@jxdltd/tanstack/og';
import type { OgConfigContext } from '@jxdltd/tanstack/og';

import { findPost } from '../src/marketing/content';

export default defineOgConfig({
  '/': () => ({
    title: 'Ship the product, not the plumbing.',
    tag: brand.description,
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
