import { megabyte, storage as storageQuota } from '@repo/billing/server';
import { database, schema } from '@repo/db';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { acceptsContentType, acceptsSize, assetKinds, isAssetKind } from '#/files/kinds';
import type { AssetKind, AssetScope } from '#/files/kinds';
import { assetUrl } from '#/files/urls';
import { requireActiveOrganization } from '#/organization/membership';
import { authenticatedMiddleware } from '#/session';

// Nothing but the server function may be exported here: the client imports
// this module, and a plain export would hold the server imports above in the
// browser bundle. Helpers live in ./assets.ts.

// The prefix is what the purge job lists by once the rows have cascaded away.
function assetKey(scope: AssetScope, ownerId: string, id: string): string {
  const prefix = scope === 'organization' ? 'orgs' : 'users';
  return `${prefix}/${ownerId}/${id}`;
}

const uploadRequest = z.object({
  kind: z.string(),
  name: z.string().min(1).max(255),
  contentType: z.string(),
  size: z.number().int().positive(),
});

/**
 * Reserves an asset and returns where to PUT its bytes. The row exists before
 * the bytes do, which is what the upload route authorizes the raw stream
 * against. The reservation holds quota immediately, so concurrent uploads
 * cannot each claim the same headroom; nothing serves until that PUT succeeds.
 */
export const createUpload = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(uploadRequest)
  .handler(async ({ data, context }) => {
    if (!isAssetKind(data.kind)) {
      throw new Error(`Unknown upload kind: ${data.kind}`);
    }
    const kind: AssetKind = data.kind;
    if (!acceptsContentType(kind, data.contentType)) {
      throw new Error(`${data.contentType} is not accepted for ${kind} uploads`);
    }
    if (!acceptsSize(kind, data.size)) {
      throw new Error(`${kind} uploads are limited to ${assetKinds[kind].maxBytes} bytes`);
    }

    const { scope } = assetKinds[kind];
    const uploadedBy = context.session.user.id;
    const organizationId =
      scope === 'organization'
        ? (await requireActiveOrganization(context.session)).organizationId
        : null;

    // Personal assets are unquotaed: every flow that writes one replaces it,
    // so an account holds at most one.
    if (organizationId !== null) {
      await storageQuota.require(organizationId, data.size / megabyte);
    }

    const id = crypto.randomUUID();
    const db = await database();
    await db.insert(schema.asset).values({
      id,
      key: assetKey(scope, organizationId ?? uploadedBy, id),
      organizationId,
      uploadedBy,
      kind,
      name: data.name,
      size: data.size,
      contentType: data.contentType,
      status: 'pending',
      createdAt: new Date(),
    });

    return { id, url: assetUrl(id) };
  });
