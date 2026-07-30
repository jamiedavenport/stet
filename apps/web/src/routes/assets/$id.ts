import { createFileRoute } from '@tanstack/react-router';

import { findAsset } from '#/files/assets';
import { isPubliclyDelivered } from '#/files/kinds';
import { serveAsset } from '#/files/serve';

// Content assets, served with no session: this is the URL the public API hands
// customers for an asset field, and the one embedded in rich text bodies, so
// it has to answer for their readers as well as for them. Safe because it
// serves only kinds marked `public` in files/kinds.ts, and only on the
// asset's own unguessable id: no listing, no enumeration, nothing derived
// from the organization.
export const Route = createFileRoute('/assets/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const asset = await findAsset(params.id);
        if (
          asset === undefined ||
          asset.status !== 'uploaded' ||
          !isPubliclyDelivered(asset.kind)
        ) {
          return new Response('Not found.', { status: 404 });
        }
        // Immutable: an asset's bytes are written once, so every hop may keep
        // this copy for as long as it likes.
        const response = await serveAsset(asset, request, 'public, max-age=31536000, immutable');
        return response ?? new Response('Not found.', { status: 404 });
      },
    },
  },
});
