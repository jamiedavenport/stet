import { brand } from '@repo/brand';
import logoUrl from '@repo/brand/logo.svg?url';
import type { PostSummary } from '#/marketing/posts';

/** Absolute origin for canonical URLs, feeds, and social meta. */
export const siteUrl = brand.url;

/** An `application/ld+json` entry for a route's head `scripts`. */
function jsonLd(data: Record<string, unknown>) {
  return { type: 'application/ld+json', children: JSON.stringify(data) };
}

/** Organization structured data for the landing page. */
export function organizationJsonLd() {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: siteUrl,
    logo: `${siteUrl}${logoUrl}`,
  });
}

/** BlogPosting structured data for a blog post page. */
export function blogPostingJsonLd(post: PostSummary) {
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    author: { '@type': 'Person', name: post.author },
    url: `${siteUrl}/blog/${post.slug}`,
    image: `${siteUrl}/og/blog/${post.slug}.png`,
  });
}

type SeoInput = {
  title: string;
  description: string;
  /** App-relative path starting with `/`, used for the canonical URL. */
  path: string;
  type?: 'website' | 'article';
  noindex?: boolean;
};

/**
 * Head tags for a marketing page: title, description, Open Graph, Twitter
 * card, and canonical link. Spread the result into a route's `head` option.
 */
export function seo({ title, description, path, type = 'website', noindex = false }: SeoInput) {
  const url = `${siteUrl}${path}`;
  // Static asset generated into public/og at build time by og/generate.ts.
  const imageUrl = `${siteUrl}/og${path === '/' ? '/index' : path}.png`;
  const meta: Record<string, string>[] = [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: brand.name },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
  ];
  if (noindex) {
    meta.push({ name: 'robots', content: 'noindex' });
  }
  return {
    meta,
    links: [{ rel: 'canonical', href: url }],
  };
}
