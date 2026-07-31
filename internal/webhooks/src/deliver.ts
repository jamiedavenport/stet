import { and, database, eq, schema, sql } from '@repo/db';
import type { Database } from '@repo/db';
import { createLogger, ExpectedFailure } from '@repo/logging';
import type { Logger } from '@repo/logging';
import { z } from 'zod';

import { registry, webhookEventTypes } from './registry';
import { webhookHeaders } from './sign';

// What travels on the queue for the deliver-webhook job (@repo/jobs wraps
// this in a defineJob). The payload is re-parsed against the type's registry
// schema below, so an envelope from an older deploy cannot deliver a
// malformed event.
export const deliverWebhookSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  type: z.enum(webhookEventTypes),
  payload: z.unknown(),
  timestamp: z.iso.datetime(),
  // Present on test sends: deliver to this one endpoint regardless of its
  // event subscriptions.
  endpointId: z.string().optional(),
});

export type DeliverWebhookInput = z.output<typeof deliverWebhookSchema>;

const requestTimeoutMs = 15_000;

// Consecutive failed deliveries before an endpoint is switched off, so a
// dead URL stops consuming queue retries. Re-enabling from the settings page
// resets the counter.
export const disableAfterConsecutiveFailures = 5;

export async function deliverWebhookEvent(input: DeliverWebhookInput): Promise<void> {
  const log = createLogger({
    webhook: { eventId: input.id, eventType: input.type },
    organization: { id: input.organizationId },
  });
  try {
    await deliverToEndpoints(input, log);
  } finally {
    log.emit();
  }
}

async function deliverToEndpoints(input: DeliverWebhookInput, log: Logger): Promise<void> {
  const db = await database();
  const definition = registry[input.type];
  const data = definition.schema.parse(input.payload);
  const body = JSON.stringify({ type: input.type, timestamp: input.timestamp, data });

  const endpoints = await db.query.webhookEndpoint.findMany({
    where: and(
      eq(schema.webhookEndpoint.organizationId, input.organizationId),
      eq(schema.webhookEndpoint.enabled, true),
    ),
  });
  const targets = endpoints.filter((endpoint) => {
    if (input.endpointId !== undefined) {
      return endpoint.id === input.endpointId;
    }
    return subscribedEvents(endpoint.events).includes(input.type);
  });

  let retryable = 0;
  let delivered = 0;
  let failed = 0;
  for (const target of targets) {
    // The delivery row is the idempotency ledger: a queue retry reruns the
    // whole handler, and endpoints that already took this event must not
    // receive it twice.
    const existing = await db.query.webhookDelivery.findFirst({
      where: and(
        eq(schema.webhookDelivery.endpointId, target.id),
        eq(schema.webhookDelivery.eventId, input.id),
      ),
    });
    if (existing?.status === 'success') {
      continue;
    }

    const responseStatus = await attemptDelivery(target, input.id, body);
    const succeeded = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;
    if (succeeded) {
      delivered = delivered + 1;
    } else {
      failed = failed + 1;
    }
    const now = new Date();
    await db
      .insert(schema.webhookDelivery)
      .values({
        id: crypto.randomUUID(),
        endpointId: target.id,
        eventId: input.id,
        eventType: input.type,
        payload: body,
        status: succeeded ? 'success' : 'failed',
        responseStatus,
        attempts: 1,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.webhookDelivery.endpointId, schema.webhookDelivery.eventId],
        set: {
          status: succeeded ? 'success' : 'failed',
          responseStatus,
          attempts: sql`${schema.webhookDelivery.attempts} + 1`,
          updatedAt: now,
        },
      });

    const stillEnabled = await recordEndpointHealth(db, target, succeeded, responseStatus);
    if (!succeeded && stillEnabled) {
      retryable = retryable + 1;
    }
  }

  log.set({ webhook: { delivered, failed } });

  // Throwing leaves the queue message unacked so failed endpoints get
  // retried; endpoints that were just disabled are excluded because the next
  // run would skip them anyway. An unreachable endpoint is the customer's
  // outage rather than ours, so this is an ExpectedFailure and the queue
  // consumer keeps it out of Sentry.
  if (retryable > 0) {
    throw new ExpectedFailure(`${retryable} of ${targets.length} deliveries failed`);
  }
}

async function attemptDelivery(
  endpoint: typeof schema.webhookEndpoint.$inferSelect,
  eventId: string,
  body: string,
): Promise<number | null> {
  const previousSecretActive =
    endpoint.previousSecret !== null &&
    endpoint.previousSecretExpiresAt !== null &&
    endpoint.previousSecretExpiresAt.getTime() > Date.now();
  const headers = webhookHeaders({
    id: eventId,
    timestamp: new Date(),
    body,
    secret: endpoint.secret,
    previousSecret: previousSecretActive ? endpoint.previousSecret : null,
  });
  try {
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    await response.body?.cancel();
    return response.status;
  } catch {
    // Network errors and timeouts have no status; the delivery row records
    // them as a null responseStatus.
    return null;
  }
}

// Success resets the consecutive-failure counter; a failure bumps it and
// switches the endpoint off at the threshold. 410 Gone is the receiver
// explicitly unsubscribing (Standard Webhooks), so it disables immediately.
async function recordEndpointHealth(
  db: Database,
  endpoint: typeof schema.webhookEndpoint.$inferSelect,
  succeeded: boolean,
  responseStatus: number | null,
): Promise<boolean> {
  if (succeeded) {
    if (endpoint.failureCount > 0) {
      await db
        .update(schema.webhookEndpoint)
        .set({ failureCount: 0 })
        .where(eq(schema.webhookEndpoint.id, endpoint.id));
    }
    return true;
  }
  const failureCount = endpoint.failureCount + 1;
  const disable = responseStatus === 410 || failureCount >= disableAfterConsecutiveFailures;
  await db
    .update(schema.webhookEndpoint)
    .set({ failureCount, enabled: !disable })
    .where(eq(schema.webhookEndpoint.id, endpoint.id));
  return !disable;
}

// `events` rows hold a JSON array written by the settings UI and public API;
// anything malformed just subscribes to nothing.
export function subscribedEvents(events: string): string[] {
  try {
    const parsed: unknown = JSON.parse(events);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}
