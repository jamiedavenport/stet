/** Where an asset is served from, and where its bytes are PUT to. */
export function assetUrl(id: string): string {
  return `/api/files/${id}`;
}

/**
 * An image URL asked to render at `width` device pixels. Only our own asset
 * URLs get the parameters: social sign-in stores the provider's avatar URL,
 * where they would do nothing or break a signature.
 */
export function imageSrc(url: string | null | undefined, width: number): string | undefined {
  if (typeof url !== 'string' || url.length === 0) {
    return undefined;
  }
  if (!url.startsWith('/api/files/')) {
    return url;
  }
  return `${url}?w=${width}&format=webp`;
}
