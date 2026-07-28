import { and, database, eq, ne, schema } from '@repo/db';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { auth } from '#/auth-server';
import { findAsset, removeAsset } from '#/files/assets';
import { assetUrl } from '#/files/urls';
import { authenticatedMiddleware } from '#/session';

/**
 * Drops every avatar the account holds except `keepId`: the photo just
 * replaced, and any upload that completed but was never adopted.
 */
async function discardAvatarsExcept(userId: string, keepId: string | null): Promise<void> {
  const db = await database();
  const stale = await db.query.asset.findMany({
    where: and(
      eq(schema.asset.uploadedBy, userId),
      eq(schema.asset.kind, 'avatar'),
      keepId === null ? undefined : ne(schema.asset.id, keepId),
    ),
  });
  for (const asset of stale) {
    await removeAsset(asset);
  }
}

/**
 * Adopts an uploaded avatar as the account's photo. Repointing before deleting
 * leaves a failure with an orphaned object rather than a profile pointing at
 * bytes that are gone.
 */
export const setAvatar = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;
    const asset = await findAsset(data.id);
    if (
      asset === undefined ||
      asset.uploadedBy !== userId ||
      asset.kind !== 'avatar' ||
      asset.status !== 'uploaded'
    ) {
      throw new Error('That upload is not available.');
    }

    await auth.api.updateUser({
      headers: context.headers,
      body: { image: assetUrl(asset.id) },
    });
    await discardAvatarsExcept(userId, asset.id);
  });

export const removeAvatar = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    await auth.api.updateUser({ headers: context.headers, body: { image: null } });
    await discardAvatarsExcept(context.session.user.id, null);
  });
