import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { contentFeatures, engineerPoints } from '@repo/ui/marketing/data';
import { sortedPosts } from '#/marketing/content';
import { siteUrl } from '#/marketing/seo';

// A plain-text overview for AI agents, following the llms.txt convention.
export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () => {
        const posts = sortedPosts().map(
          (post) => `- [${post.title}](${siteUrl}/blog/${post.slug}): ${post.summary}`,
        );

        const text = [
          `# ${brand.name}`,
          '',
          `> ${brand.description}. Marketing owns the content model; engineering gets a typed client generated from it; changes cross the gap as deprecations, never as breakage. Realtime collaboration, drafts and scheduled publishing, localization, AI assistance, and first-party analytics are built in.`,
          '',
          `${brand.name} is built by ${brand.author.name} (${brand.author.url}). Source: ${brand.repository}`,
          '',
          '## For content teams',
          '',
          ...contentFeatures().map((feature) => `- ${feature.name}: ${feature.description}`),
          '',
          '## For engineers',
          '',
          ...engineerPoints().map((point) => `- ${point.term}: ${point.detail}`),
          '',
          '## Docs',
          '',
          `- [Documentation](${brand.docs})`,
          `- [Changelog](${siteUrl}/changelog)`,
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
