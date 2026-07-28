import { and, database, eq, inArray, lt, schema } from '@repo/db';
import { enqueue } from '@repo/jobs/client';

const uploadWindowMs = 60 * 60 * 1000;

/**
 * Retires uploads whose bytes never arrived, and any whose PUT stored them but
 * failed to mark the row live, so the keys are always worth deleting. The rows
 * go here and the objects to the purge job, which owns the bucket.
 */
export async function sweepPendingAssets(): Promise<void> {
  const db = await database();
  const stale = await db.query.asset.findMany({
    where: and(
      eq(schema.asset.status, 'pending'),
      lt(schema.asset.createdAt, new Date(Date.now() - uploadWindowMs)),
    ),
  });
  if (stale.length === 0) {
    return;
  }

  await db.delete(schema.asset).where(
    inArray(
      schema.asset.id,
      stale.map((asset) => asset.id),
    ),
  );
  await enqueue('purge-assets', { keys: stale.map((asset) => asset.key) });
  console.log(`[crons] sweep-pending-assets reclaimed ${stale.length} abandoned uploads.`);
}
