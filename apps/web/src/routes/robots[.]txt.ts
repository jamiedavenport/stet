import { createFileRoute } from '@tanstack/react-router';

import { siteUrl } from '#/marketing/seo';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const lines = [
          'User-agent: *',
          'Disallow: /app',
          'Disallow: /api/',
          'Disallow: /sign/',
          'Disallow: /orgs/',
          'Disallow: /invite/',
          'Disallow: /device',
          'Allow: /',
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n');

        return new Response(lines, {
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    },
  },
});
