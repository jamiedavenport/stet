import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { features } from '#/marketing/data/features';
import { personas } from '#/marketing/data/personas';
import { rivals } from '#/marketing/data/rivals';
import { listPosts } from '#/marketing/posts';
import { siteUrl } from '#/marketing/seo';

// A plain-text overview for AI agents, following the llms.txt convention.
export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        const posts = (await listPosts()).map(
          (post) => `- [${post.title}](${siteUrl}/blog/${post.slug}): ${post.summary}`,
        );

        const text = [
          `# ${brand.name}`,
          '',
          `> ${brand.description}. Marketing owns the content model in the UI; engineering gets a typed client generated from it; changes cross the gap as deprecations, never as breakage. Realtime collaboration, first-party cookieless analytics and an approve-before-it-writes AI assistant are built in. Open source, hosted or self-hosted.`,
          '',
          `${brand.name} is built by ${brand.author.name} (${brand.author.url}). Source: ${brand.repository}`,
          '',
          '## Features',
          '',
          ...features.map(
            (feature) =>
              `- [${feature.name}](${siteUrl}/features/${feature.slug}): ${feature.tagline}`,
          ),
          '',
          '## Who it is for',
          '',
          ...personas.map(
            (persona) =>
              `- [For ${persona.name}](${siteUrl}/for/${persona.slug}): ${persona.tagline}`,
          ),
          '',
          '## Comparisons',
          '',
          ...rivals.map(
            (rival) =>
              `- [${brand.name} vs ${rival.name}](${siteUrl}/compare/${rival.slug}): ${rival.tagline}`,
          ),
          '',
          '## Pricing',
          '',
          `- [Pricing](${siteUrl}/pricing): $10 per user per month on the hosted cloud, free to self-host, custom for enterprises. Every feature is on every plan.`,
          '',
          '## Docs',
          '',
          `- [Documentation](${brand.docs})`,
          '',
          '## Blog',
          '',
          ...posts,
          '',
        ].join('\n');

        return new Response(text, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
