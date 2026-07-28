import { database, eq, schema } from '@repo/db';

import { storage } from '#/storage';

export type Asset = typeof schema.asset.$inferSelect;

export async function findAsset(id: string): Promise<Asset | undefined> {
  const db = await database();
  return db.query.asset.findFirst({ where: eq(schema.asset.id, id) });
}

/** Marks a pending asset live once R2 has acknowledged its bytes. */
export async function completeUpload(id: string): Promise<void> {
  const db = await database();
  await db.update(schema.asset).set({ status: 'uploaded' }).where(eq(schema.asset.id, id));
}

/** Removes an asset's object then its row, so a failure leaves something to retry rather than orphaned bytes. */
export async function removeAsset(asset: Pick<Asset, 'id' | 'key'>): Promise<void> {
  await storage.delete(asset.key);
  const db = await database();
  await db.delete(schema.asset).where(eq(schema.asset.id, asset.id));
}
