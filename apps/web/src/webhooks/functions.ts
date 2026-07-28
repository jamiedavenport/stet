import { and, database, desc, eq, inArray, schema } from '@repo/db';
import { emitWebhookEvent, redeliverWebhookEvent } from '@repo/webhooks/client';
import { webhookEventTypes } from '@repo/webhooks/registry';
import {
  generateWebhookSecret,
  isDeliverableWebhookUrl,
  secretRotationGraceMs,
  subscribedEvents,
} from '@repo/webhooks/server';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { organizationAdminMiddleware } from '#/session';

const recentDeliveriesLimit = 20;

// Secrets never ride along with the list; revealWebhookSecret fetches one on
// demand so a cached page snapshot cannot leak them.
const getWebhooks = createServerFn({ method: 'GET' })
  .middleware([organizationAdminMiddleware])
  .handler(async ({ context }) => {
    const db = await database();
    const endpoints = await db.query.webhookEndpoint.findMany({
      where: eq(schema.webhookEndpoint.organizationId, context.organizationId),
      orderBy: desc(schema.webhookEndpoint.createdAt),
    });
    const deliveries =
      endpoints.length === 0
        ? []
        : await db.query.webhookDelivery.findMany({
            where: inArray(
              schema.webhookDelivery.endpointId,
              endpoints.map((endpoint) => endpoint.id),
            ),
            orderBy: desc(schema.webhookDelivery.updatedAt),
            limit: recentDeliveriesLimit,
          });
    const urls = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint.url]));
    return {
      endpoints: endpoints.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        events: subscribedEvents(endpoint.events),
        enabled: endpoint.enabled,
        failureCount: endpoint.failureCount,
        createdAt: endpoint.createdAt,
      })),
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id,
        endpointUrl: urls.get(delivery.endpointId) ?? '',
        eventType: delivery.eventType,
        status: delivery.status,
        responseStatus: delivery.responseStatus,
        attempts: delivery.attempts,
        updatedAt: delivery.updatedAt,
      })),
    };
  });

export type WebhooksData = Awaited<ReturnType<typeof getWebhooks>>;

async function requireEndpoint(organizationId: string, id: string) {
  const db = await database();
  const endpoint = await db.query.webhookEndpoint.findFirst({
    where: and(
      eq(schema.webhookEndpoint.id, id),
      eq(schema.webhookEndpoint.organizationId, organizationId),
    ),
  });
  if (endpoint === undefined) {
    throw new Error('Webhook endpoint not found');
  }
  return endpoint;
}

export const createWebhook = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(
    z.object({
      url: z.url(),
      events: z.array(z.enum(webhookEventTypes)).min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await database();
    if (!isDeliverableWebhookUrl(data.url)) {
      throw new Error('undeliverable-url');
    }
    await db.insert(schema.webhookEndpoint).values({
      id: crypto.randomUUID(),
      organizationId: context.organizationId,
      url: data.url,
      secret: generateWebhookSecret(),
      events: JSON.stringify(data.events),
      enabled: true,
      failureCount: 0,
      createdAt: new Date(),
    });
  });

export const deleteWebhook = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    await db
      .delete(schema.webhookEndpoint)
      .where(
        and(
          eq(schema.webhookEndpoint.id, data.id),
          eq(schema.webhookEndpoint.organizationId, context.organizationId),
        ),
      );
  });

// Re-enabling also clears the consecutive-failure counter so an auto-disabled
// endpoint gets a fresh run at the threshold.
export const setWebhookEnabled = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ id: z.string(), enabled: z.boolean() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const endpoint = await requireEndpoint(context.organizationId, data.id);
    await db
      .update(schema.webhookEndpoint)
      .set({
        enabled: data.enabled,
        failureCount: data.enabled ? 0 : endpoint.failureCount,
      })
      .where(eq(schema.webhookEndpoint.id, endpoint.id));
  });

export const revealWebhookSecret = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const endpoint = await requireEndpoint(context.organizationId, data.id);
    return { secret: endpoint.secret };
  });

export const rotateWebhookSecret = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const endpoint = await requireEndpoint(context.organizationId, data.id);
    const secret = generateWebhookSecret();
    await db
      .update(schema.webhookEndpoint)
      .set({
        secret,
        previousSecret: endpoint.secret,
        previousSecretExpiresAt: new Date(Date.now() + secretRotationGraceMs),
      })
      .where(eq(schema.webhookEndpoint.id, endpoint.id));
    return { secret };
  });

// Targets the endpoint directly (ignoring subscriptions) so a test always
// lands, even while the endpoint is still subscribed to nothing useful.
export const sendTestWebhook = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const endpoint = await requireEndpoint(context.organizationId, data.id);
    await emitWebhookEvent({
      organizationId: context.organizationId,
      type: 'ping',
      payload: {
        message: 'Test delivery requested from the webhooks settings page.',
      },
      endpointId: endpoint.id,
    });
  });

// Re-queues a recorded delivery to its endpoint with the original event id,
// for failures that outlived the queue's own retries. The stored body is
// `{ type, timestamp, data }` exactly as it was sent; only `data` goes back
// on the queue because the job re-wraps it.
export const redeliverWebhook = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ deliveryId: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const delivery = await db.query.webhookDelivery.findFirst({
      where: eq(schema.webhookDelivery.id, data.deliveryId),
    });
    if (delivery === undefined) {
      throw new Error('Delivery not found');
    }
    await requireEndpoint(context.organizationId, delivery.endpointId);
    const eventType = webhookEventTypes.find((type) => type === delivery.eventType);
    if (eventType === undefined) {
      throw new Error('Event type no longer exists');
    }
    const body = JSON.parse(delivery.payload) as { timestamp: string; data: unknown };
    await redeliverWebhookEvent({
      organizationId: context.organizationId,
      endpointId: delivery.endpointId,
      eventId: delivery.eventId,
      type: eventType,
      payload: body.data,
      timestamp: body.timestamp,
    });
  });

export const webhooksQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['webhooks', organizationId],
    queryFn: () => getWebhooks(),
    staleTime: 30_000,
  });
