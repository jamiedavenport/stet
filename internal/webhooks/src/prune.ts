import { database, lt, schema } from '@repo/db';

// The ledger's idempotency role ends once a queue message can no longer be
// retried (hours); rows older than this are only settings-page history.
export const deliveryRetentionDays = 30;

export async function pruneWebhookDeliveries(now = new Date()): Promise<number> {
  const db = await database();
  const cutoff = new Date(now.getTime() - deliveryRetentionDays * 24 * 60 * 60 * 1000);
  const stale = lt(schema.webhookDelivery.updatedAt, cutoff);
  const removed = await db.$count(schema.webhookDelivery, stale);
  if (removed > 0) {
    await db.delete(schema.webhookDelivery).where(stale);
  }
  return removed;
}
