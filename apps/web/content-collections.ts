import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMarkdown } from '@content-collections/markdown';
import { brand } from '@repo/brand';
import rehypeShiki from '@shikijs/rehype';
import { z } from 'zod';

// Markdown compiles to HTML at build time (Shiki-highlighted) so routes can
// `dangerouslySetInnerHTML` it -- Workers can't eval at runtime.
const posts = defineCollection({
  name: 'posts',
  directory: 'content/posts',
  include: '**/*.md',
  schema: z.object({
    content: z.string(),
    title: z.string(),
    summary: z.string(),
    date: z.iso.date(),
    author: z.string().default(brand.author.name),
    tags: z.array(z.string()).default([]),
  }),
  transform: async (document, context) => {
    const html = await compileMarkdown(context, document, {
      rehypePlugins: [[rehypeShiki, { theme: 'vesper' }]],
    });
    const words = document.content.trim().split(/\s+/).length;
    return {
      ...document,
      html,
      slug: document._meta.path,
      readingTime: Math.max(1, Math.round(words / 220)),
    };
  },
});

// One file per shipped release or feature drop, newest first on /changelog.
const releases = defineCollection({
  name: 'releases',
  directory: 'content/releases',
  include: '**/*.md',
  schema: z.object({
    content: z.string(),
    title: z.string(),
    date: z.iso.date(),
    tags: z.array(z.string()).default([]),
  }),
  transform: async (document, context) => {
    const html = await compileMarkdown(context, document, {
      rehypePlugins: [[rehypeShiki, { theme: 'vesper' }]],
    });
    return { ...document, html };
  },
});

export default defineConfig({
  content: [posts, releases],
});
