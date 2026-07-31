import { createFileRoute } from '@tanstack/react-router';

import { features } from '#/marketing/data/features';
import { personas } from '#/marketing/data/personas';
import { rivals } from '#/marketing/data/rivals';
import { listPosts } from '#/marketing/posts';
import { siteUrl } from '#/marketing/seo';

// Marketing pages only: the signed-in app, auth pages, and API stay out of
// the index (robots.txt disallows them too).
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const posts = await listPosts();

        const pages: { path: string; lastmod?: string }[] = [
          { path: '/' },
          { path: '/features' },
          ...features.map((feature) => ({ path: `/features/${feature.slug}` })),
          { path: '/for' },
          ...personas.map((persona) => ({ path: `/for/${persona.slug}` })),
          { path: '/compare' },
          ...rivals.map((rival) => ({ path: `/compare/${rival.slug}` })),
          { path: '/pricing' },
          { path: '/blog' },
          { path: '/contact' },
          { path: '/privacy' },
          { path: '/cookies' },
          ...posts.map((post) => ({ path: `/blog/${post.slug}`, lastmod: post.date })),
        ];

        const urls = pages
          .map((page) => {
            const lastmod = page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : '';
            return `  <url><loc>${siteUrl}${page.path}</loc>${lastmod}</url>`;
          })
          .join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});
