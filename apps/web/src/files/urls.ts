/** Where a private asset is served from, and where every asset's bytes are PUT to. */
export function assetUrl(id: string): string {
  return `/api/files/${id}`;
}

/**
 * Where a content asset is served from: no session, so the customer's own
 * pages and their readers can load it. Only kinds marked `public` in
 * ./kinds.ts answer here.
 */
export function publicAssetUrl(id: string): string {
  return `/assets/${id}`;
}

const transformable = ['/api/files/', '/assets/'];

/**
 * An image URL asked to render at `width` device pixels. Only our own asset
 * URLs get the parameters: social sign-in stores the provider's avatar URL,
 * where they would do nothing or break a signature.
 */
export function imageSrc(url: string | null | undefined, width: number): string | undefined {
  if (typeof url !== 'string' || url.length === 0) {
    return undefined;
  }
  if (!transformable.some((prefix) => url.startsWith(prefix))) {
    return url;
  }
  return `${url}?w=${width}&format=webp`;
}
