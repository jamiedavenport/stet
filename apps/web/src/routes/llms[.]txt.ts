import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { features, packages } from '@repo/ui/marketing/data';
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
          `> ${brand.description}. A full-stack TypeScript starter kit on Cloudflare: authentication, organizations, Stripe billing, a public REST API with a typed client and CLI, file uploads, transactional email, realtime collaboration, an AI assistant, and background work. Everything runs in a single Cloudflare Worker and is typed end to end.`,
          '',
          `${brand.name} is sold as a template and included in every engagement with ${brand.author.name} (${brand.author.url}).`,
          '',
          '## Features',
          '',
          ...features().map((feature) => `- ${feature.name}: ${feature.description}`),
          '',
          '## Packages',
          '',
          ...packages().map((pkg) => `- ${pkg.name}: ${pkg.description}`),
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
