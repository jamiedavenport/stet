import { enqueue } from '@repo/jobs/client';

/**
 * Queues the removal of everything an owner had stored. The foreign keys clear
 * the asset table but nothing in D1 reaches into R2, so call this before the
 * delete. Best-effort: a queue hiccup must never fail the deletion.
 */
export async function purgeAssets(scope: 'organization' | 'user', ownerId: string): Promise<void> {
  try {
    await enqueue('purge-assets', { scope, ownerId });
  } catch (error) {
    console.error(`[auth] Failed to enqueue asset purge for ${scope} ${ownerId}:`, error);
  }
}
