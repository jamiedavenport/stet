import { cleanupAuth } from './crons/cleanup-auth';
import { pruneRevisionsCron } from './crons/prune-revisions';
import { pruneWebhookDeliveriesCron } from './crons/prune-webhook-deliveries';
import { sweepPendingAssets } from './crons/sweep-pending-assets';
import type { CronHandler } from './define';
import type { CronExpression } from './schedule';

// One handler per cron expression. The expressions live in schedule.ts (the
// module the wrangler config is generated from) and the `satisfies` below
// fails the build if the two ever drift: a schedule entry without a handler
// or a handler without a schedule entry is a type error.
export const registry = {
  '0 3 * * *': cleanupAuth,
  '30 3 * * *': pruneWebhookDeliveriesCron,
  '45 3 * * *': pruneRevisionsCron,
  // Hourly, not nightly: abandoned uploads hold storage quota.
  '15 * * * *': sweepPendingAssets,
} as const satisfies Record<CronExpression, CronHandler>;
