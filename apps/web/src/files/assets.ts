import { recordAudit } from '@repo/audit';
import { database, eq, schema } from '@repo/db';

import { storage } from '#/storage';

export type Asset = typeof schema.asset.$inferSelect;

export async function findAsset(id: string): Promise<Asset | undefined> {
  const db = await database();
  return db.query.asset.findFirst({ where: eq(schema.asset.id, id) });
}

/**
 * Marks a pending asset live once R2 has acknowledged its bytes. This is where
 * an upload becomes a fact, so it is what the audit log records; a reservation
 * whose bytes never arrive is not an event anyone needs.
 */
export async function completeUpload(asset: Asset): Promise<void> {
  const db = await database();
  await db.update(schema.asset).set({ status: 'uploaded' }).where(eq(schema.asset.id, asset.id));
  // Personal assets (avatars) belong to no organization, so no log holds them.
  if (asset.organizationId !== null) {
    await recordAudit({
      organizationId: asset.organizationId,
      actor: { userId: asset.uploadedBy, via: 'app' },
      action: 'asset.upload',
      subject: { type: 'asset', id: asset.id, label: asset.name },
      details: { kind: asset.kind, contentType: asset.contentType, size: asset.size },
    });
  }
}

/** Removes an asset's object then its row, so a failure leaves something to retry rather than orphaned bytes. */
export async function removeAsset(asset: Pick<Asset, 'id' | 'key'>): Promise<void> {
  await storage.delete(asset.key);
  const db = await database();
  await db.delete(schema.asset).where(eq(schema.asset.id, asset.id));
}
