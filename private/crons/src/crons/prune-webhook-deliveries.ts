import { deliveryRetentionDays, pruneWebhookDeliveries } from '@repo/webhooks/server';

// The webhook delivery ledger grows with every attempt and its idempotency
// job is over within hours (queue retries exhaust); older rows are only
// settings-page history, so they are swept nightly.
export async function pruneWebhookDeliveriesCron(): Promise<void> {
  const removed = await pruneWebhookDeliveries();
  console.log(
    `[crons] prune-webhook-deliveries removed ${removed} rows older than ${deliveryRetentionDays} days.`,
  );
}
