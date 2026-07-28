import { createFileRoute } from '@tanstack/react-router';

import { auth } from '#/auth-server';
import { canReadAsset } from '#/files/access';
import { completeUpload, findAsset } from '#/files/assets';
import type { Asset } from '#/files/assets';
import { applyTransform, isImageFormat, parseTransform } from '#/files/transform';
import { storage } from '#/storage';

const notFound = () => new Response('Not found.', { status: 404 });

const unauthorized = () => new Response('Unauthorized.', { status: 401 });

// Ids are unguessable and every asset is written once, so a cached copy can
// never go stale. Private because the response depends on who asked.
const cacheControl = 'private, max-age=31536000, immutable';

function disposition(asset: Asset): string {
  if (isImageFormat(asset.contentType)) {
    return 'inline';
  }
  // Downloading rather than rendering stops a kind that one day accepts SVG
  // or HTML executing same-origin. The name is user-supplied, so it goes in
  // the RFC 5987 slot, where it is percent-encoded.
  return `attachment; filename*=UTF-8''${encodeURIComponent(asset.name)}`;
}

export const Route = createFileRoute('/api/files/$id')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session === null) {
          return unauthorized();
        }

        const asset = await findAsset(params.id);
        if (
          asset === undefined ||
          asset.uploadedBy !== session.user.id ||
          asset.status !== 'pending'
        ) {
          return notFound();
        }

        // R2 needs the length up front to store a stream, and matching it
        // against the reservation is also what stops a caller reserving a
        // small file to clear the quota and then sending a large one.
        if (Number(request.headers.get('content-length')) !== asset.size) {
          return new Response('Content-Length must match the reserved size.', { status: 400 });
        }
        if (request.body === null) {
          return new Response('Expected a body.', { status: 400 });
        }

        await storage.put(asset.key, request.body, {
          httpMetadata: { contentType: asset.contentType },
        });
        await completeUpload(asset.id);
        return new Response(null, { status: 204 });
      },

      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session === null) {
          return unauthorized();
        }

        const asset = await findAsset(params.id);
        if (asset === undefined || asset.status !== 'uploaded') {
          return notFound();
        }
        if (!(await canReadAsset(asset, session.user))) {
          return notFound();
        }

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
            return notFound();
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
          return notFound();
        }
        return new Response(stored.body, { headers });
      },
    },
  },
});
