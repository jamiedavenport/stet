import type { Logger } from '@repo/logging';
import { deliveryRetentionDays, pruneWebhookDeliveries } from '@repo/webhooks/server';

// The webhook delivery ledger grows with every attempt and its idempotency
// job is over within hours (queue retries exhaust); older rows are only
// settings-page history, so they are swept nightly.
export async function pruneWebhookDeliveriesCron(log: Logger): Promise<void> {
  const removed = await pruneWebhookDeliveries();
  log.set({ cron: { removed } });
  log.info(`Removed ${removed} deliveries older than ${deliveryRetentionDays} days.`);
}
