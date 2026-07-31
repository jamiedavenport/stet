import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Organization subscriptions managed by the @better-auth/stripe plugin
// (wired in @repo/billing). referenceId holds an organization id with no FK:
// the plugin treats it as a polymorphic reference, and rows must survive to
// let organizations resubscribe after a cancellation. createdAt/updatedAt
// use client-side defaults because the plugin does not supply them.
export const subscription = sqliteTable('subscription', {
  id: text('id').primaryKey(),
  plan: text('plan').notNull(),
  referenceId: text('reference_id').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  status: text('status').notNull(),
  periodStart: integer('period_start', { mode: 'timestamp' }),
  periodEnd: integer('period_end', { mode: 'timestamp' }),
  trialStart: integer('trial_start', { mode: 'timestamp' }),
  trialEnd: integer('trial_end', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }),
  cancelAt: integer('cancel_at', { mode: 'timestamp' }),
  canceledAt: integer('canceled_at', { mode: 'timestamp' }),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  seats: integer('seats'),
  billingInterval: text('billing_interval'),
  stripeScheduleId: text('stripe_schedule_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

// Counters behind metered billing features (see @repo/billing). One row per
// organization, meter, and period bucket: 'YYYY-MM' for monthly windows,
// 'all' for meters that never reset. consume() upserts `used` atomically, so
// there is no default: writers always supply the value.
export const usage = sqliteTable(
  'usage',
  {
    organizationId: text('organization_id').notNull(),
    meter: text('meter').notNull(),
    period: text('period').notNull(),
    used: integer('used').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.meter, table.period] })],
);
