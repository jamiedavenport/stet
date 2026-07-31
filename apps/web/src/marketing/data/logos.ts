// Competitor marks come from logo.dev's image CDN, which takes a publishable
// key. It is publishable by design -- it ships in the HTML of every
// comparison page -- so it lives here rather than in a secret, the same call
// DEPLOY.md makes for the Sentry DSN. An operator self-hosting Stet can point
// it at their own key with VITE_LOGO_DEV_TOKEN.
//
// Free-tier commercial use requires attribution, which the footer carries.

const DEFAULT_TOKEN = 'pk_BqdEKAWHSTeXXKuiH4dxAw';

const token = import.meta.env.VITE_LOGO_DEV_TOKEN ?? DEFAULT_TOKEN;

/** Whether competitor marks can be rendered at all. */
const logosEnabled = typeof token === 'string' && token.length > 0;

/**
 * A square mark for a company domain, or undefined when no token is set.
 *
 * `fallback=404` is deliberate: left to itself the CDN answers a missing
 * logo with a monogram of its own, and two monogram styles on one page is
 * worse than one. A 404 renders nothing, so our own tile shows through.
 */
export function logoUrl(domain: string, size = 128): string | undefined {
  if (!logosEnabled) {
    return undefined;
  }
  const query = new URLSearchParams({
    token: String(token),
    size: String(size),
    format: 'png',
    retina: 'true',
    fallback: '404',
  });
  return `https://img.logo.dev/${domain}?${query.toString()}`;
}
