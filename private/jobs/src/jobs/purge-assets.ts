import { and, database, isNull, schema } from '@repo/db';
import { z } from 'zod';

import { defineJob } from '../define';
import type { AssetStorage } from '../define';

// R2 accepts at most 1000 keys per delete call.
const deleteBatch = 1000;

// Two shapes: a deleted owner has taken its rows with it, leaving the prefix
// as the only handle on what it had; the sweep in @repo/crons still holds the
// rows and sends their keys.
const purgeAssetsSchema = z.union([
  z.object({ scope: z.enum(['organization', 'user']), ownerId: z.string().min(1) }),
  z.object({ keys: z.array(z.string().min(1)).min(1) }),
]);

async function deleteKeys(storage: AssetStorage, keys: string[]): Promise<void> {
  for (let index = 0; index < keys.length; index = index + deleteBatch) {
    await storage.delete(keys.slice(index, index + deleteBatch));
  }
}

async function purgePrefix(storage: AssetStorage, prefix: string): Promise<number> {
  let cursor: string | undefined;
  let removed = 0;
  do {
    const page = await storage.list({ prefix, cursor });
    if (page.objects.length > 0) {
      await deleteKeys(
        storage,
        page.objects.map((object) => object.key),
      );
      removed = removed + page.objects.length;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor !== undefined);
  return removed;
}

export const purgeAssetsJob = defineJob({
  name: 'purge-assets',
  schema: purgeAssetsSchema,
  handle: async (payload, { storage }) => {
    if ('keys' in payload) {
      await deleteKeys(storage, payload.keys);
      console.log(`[jobs] purge-assets removed ${payload.keys.length} objects.`);
      return;
    }

    // Nothing else collects a closed account's personal assets: the foreign
    // key has just nulled the only owner their rows carried.
    if (payload.scope === 'user') {
      const db = await database();
      await db
        .delete(schema.asset)
        .where(and(isNull(schema.asset.organizationId), isNull(schema.asset.uploadedBy)));
    }

    const prefix = payload.scope === 'organization' ? 'orgs' : 'users';
    const removed = await purgePrefix(storage, `${prefix}/${payload.ownerId}/`);
    console.log(
      `[jobs] purge-assets removed ${removed} objects for ${payload.scope} ${payload.ownerId}.`,
    );
  },
});
