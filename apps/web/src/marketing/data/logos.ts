// Competitor marks come from logo.dev, which needs a publishable token.
// The token is publishable by design: it ships in the HTML, so it is a build
// var rather than a worker secret.
//
// Without it every logo call would 401, so `logoUrl` returns undefined and
// the comparison pages fall back to the product's name in type. A missing
// third-party key is never allowed to leave a hole in the page.

const token = import.meta.env.VITE_LOGO_DEV_TOKEN;

/** Whether competitor marks can be rendered at all. */
export const logosEnabled = typeof token === 'string' && token.length > 0;

/**
 * A square mark for a company domain, or undefined when no token is set.
 * `size` is the intrinsic pixel size requested; render it at half that for
 * a sharp result on a 2x display.
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
  });
  return `https://img.logo.dev/${domain}?${query.toString()}`;
}
