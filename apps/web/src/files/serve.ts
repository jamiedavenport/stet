import type { Asset } from '#/files/assets';
import { applyTransform, isImageFormat, parseTransform } from '#/files/transform';
import { storage } from '#/storage';

// Reading an asset's bytes out of R2, shared by the two serving routes: the
// session-checked /api/files/$id and the public /assets/$id.

function disposition(asset: Asset): string {
  if (isImageFormat(asset.contentType)) {
    return 'inline';
  }
  // Downloading rather than rendering stops a kind that one day accepts SVG
  // or HTML executing same-origin. The name is user-supplied, so it goes in
  // the RFC 5987 slot, where it is percent-encoded.
  return `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`;
}

/**
 * The asset's bytes, transformed if the query asks for it and the transform
 * succeeds. `cacheControl` differs by route: a public asset is cacheable by
 * any hop, a private one only by the browser that asked.
 *
 * Returns null when the object is missing from R2, which the caller answers
 * as a 404: the row can outlive the object between a purge and its sweep.
 */
export async function serveAsset(
  asset: Asset,
  request: Request,
  cacheControl: string,
): Promise<Response | null> {
  const headers = {
    'Content-Type': asset.contentType,
    'Content-Disposition': disposition(asset),
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  };

  const transform = parseTransform(new URL(request.url).searchParams, asset.contentType);
  if (transform !== null) {
    const object = await storage.get(asset.key);
    if (object === null) {
      return null;
    }
    const transformed = await applyTransform(object.body, transform);
    if (transformed !== null) {
      return new Response(transformed.body, {
        headers: { ...headers, 'Content-Type': transform.format },
      });
    }
  }

  const stored = await storage.get(asset.key);
  if (stored === null) {
    return null;
  }
  return new Response(stored.body, { headers });
}
