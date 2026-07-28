import { and, database, desc, eq, schema } from '@repo/db';
import { webhookEventTypes } from '@repo/webhooks/registry';
import type { WebhookEventType } from '@repo/webhooks/registry';
import {
  generateWebhookSecret,
  isDeliverableWebhookUrl,
  secretRotationGraceMs,
  subscribedEvents,
} from '@repo/webhooks/server';

import { authenticated, os } from '#/api/implementer';

type EndpointRow = typeof schema.webhookEndpoint.$inferSelect;

// Event types that have left the registry are dropped rather than breaking
// the wire schema's enum.
function toWireEndpoint(endpoint: EndpointRow) {
  const events = subscribedEvents(endpoint.events).filter((event): event is WebhookEventType =>
    (webhookEventTypes as readonly string[]).includes(event),
  );
  return {
    id: endpoint.id,
    url: endpoint.url,
    events,
    enabled: endpoint.enabled,
    createdAt: endpoint.createdAt.toISOString(),
  };
}

async function findEndpoint(organizationId: string, id: string): Promise<EndpointRow | undefined> {
  const db = await database();
  return db.query.webhookEndpoint.findFirst({
    where: and(
      eq(schema.webhookEndpoint.id, id),
      eq(schema.webhookEndpoint.organizationId, organizationId),
    ),
  });
}

const list = os.webhooks.list.use(authenticated).handler(async ({ context }) => {
  const db = await database();
  const endpoints = await db.query.webhookEndpoint.findMany({
    where: eq(schema.webhookEndpoint.organizationId, context.organizationId),
    orderBy: desc(schema.webhookEndpoint.createdAt),
  });
  return endpoints.map(toWireEndpoint);
});

const create = os.webhooks.create.use(authenticated).handler(async ({ context, input, errors }) => {
  const db = await database();
  if (!isDeliverableWebhookUrl(input.url)) {
    throw errors.BAD_REQUEST();
  }
  const endpoint: typeof schema.webhookEndpoint.$inferInsert = {
    id: crypto.randomUUID(),
    organizationId: context.organizationId,
    url: input.url,
    secret: generateWebhookSecret(),
    events: JSON.stringify(input.events),
    enabled: true,
    failureCount: 0,
    createdAt: new Date(),
  };
  await db.insert(schema.webhookEndpoint).values(endpoint);
  return {
    id: endpoint.id,
    url: endpoint.url,
    events: input.events,
    enabled: true,
    createdAt: endpoint.createdAt.toISOString(),
    secret: endpoint.secret,
  };
});

const remove = os.webhooks.delete.use(authenticated).handler(async ({ context, input, errors }) => {
  const db = await database();
  const deleted = await db
    .delete(schema.webhookEndpoint)
    .where(
      and(
        eq(schema.webhookEndpoint.id, input.id),
        eq(schema.webhookEndpoint.organizationId, context.organizationId),
      ),
    )
    .returning({ id: schema.webhookEndpoint.id });
  if (deleted.length === 0) {
    throw errors.NOT_FOUND();
  }
  return { id: input.id };
});

const rotateSecret = os.webhooks.rotateSecret
  .use(authenticated)
  .handler(async ({ context, input, errors }) => {
    const db = await database();
    const endpoint = await findEndpoint(context.organizationId, input.id);
    if (endpoint === undefined) {
      throw errors.NOT_FOUND();
    }
    const secret = generateWebhookSecret();
    await db
      .update(schema.webhookEndpoint)
      .set({
        secret,
        previousSecret: endpoint.secret,
        previousSecretExpiresAt: new Date(Date.now() + secretRotationGraceMs),
      })
      .where(eq(schema.webhookEndpoint.id, endpoint.id));
    return { ...toWireEndpoint(endpoint), secret };
  });

const deliveries = os.webhooks.deliveries
  .use(authenticated)
  .handler(async ({ context, input, errors }) => {
    const db = await database();
    const endpoint = await findEndpoint(context.organizationId, input.id);
    if (endpoint === undefined) {
      throw errors.NOT_FOUND();
    }
    const rows = await db.query.webhookDelivery.findMany({
      where: eq(schema.webhookDelivery.endpointId, endpoint.id),
      orderBy: desc(schema.webhookDelivery.createdAt),
      limit: 20,
    });
    return rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      eventType: row.eventType,
      status: row.status === 'success' ? ('success' as const) : ('failed' as const),
      responseStatus: row.responseStatus,
      attempts: row.attempts,
      createdAt: row.createdAt.toISOString(),
    }));
  });

export const webhooks = {
  list,
  create,
  delete: remove,
  rotateSecret,
  deliveries,
};
