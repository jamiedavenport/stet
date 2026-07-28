import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { organization } from './organizations.ts';

// Outbound webhook endpoints registered by an organization (see
// @repo/webhooks). `events` is a JSON array of subscribed event types from
// the registry. After a secret rotation the previous secret keeps signing
// alongside the new one until its expiry, so receivers can roll over without
// dropping deliveries.
export const webhookEndpoint = sqliteTable(
  'webhook_endpoint',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    previousSecret: text('previous_secret'),
    previousSecretExpiresAt: integer('previous_secret_expires_at', { mode: 'timestamp' }),
    events: text('events').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull(),
    // Consecutive failed deliveries; reset on success. The delivery job
    // disables the endpoint when it crosses the auto-disable threshold.
    failureCount: integer('failure_count').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [index('webhook_endpoint_org_idx').on(table.organizationId)],
);

// One row per (event, endpoint) attempt, upserted by the deliver-webhook job.
// The unique index is the idempotency ledger: a queue retry skips endpoints
// whose row already says success instead of delivering twice.
export const webhookDelivery = sqliteTable(
  'webhook_delivery',
  {
    id: text('id').primaryKey(),
    endpointId: text('endpoint_id')
      .notNull()
      .references(() => webhookEndpoint.id, { onDelete: 'cascade' }),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: text('payload').notNull(),
    status: text('status').notNull(),
    responseStatus: integer('response_status'),
    attempts: integer('attempts').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('webhook_delivery_event_idx').on(table.endpointId, table.eventId),
    index('webhook_delivery_recent_idx').on(table.endpointId, table.createdAt),
  ],
);
