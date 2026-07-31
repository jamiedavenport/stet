import { brand } from '@repo/brand';
import { createFileRoute } from '@tanstack/react-router';

import { listPosts, postDate, postSummary } from '#/marketing/posts';
import { siteUrl } from '#/marketing/seo';

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export const Route = createFileRoute('/rss.xml')({
  server: {
    handlers: {
      GET: async () => {
        const posts = await listPosts();
        const items = posts
          .map(
            (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description>${escapeXml(postSummary(post))}</description>
      <pubDate>${new Date(postDate(post)).toUTCString()}</pubDate>
    </item>`,
          )
          .join('\n');

        const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${brand.name} Blog</title>
    <link>${siteUrl}/blog</link>
    <description>${escapeXml(`Notes from building ${brand.name}: design decisions and engineering write-ups.`)}</description>
    <language>en-gb</language>
${items}
  </channel>
</rss>`;

        return new Response(rss, {
          headers: { 'Content-Type': 'application/rss+xml' },
        });
      },
    },
  },
});
