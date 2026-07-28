import { schema, setDatabase } from '@repo/db';
import type { Database as OnyxDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { deliveryRetentionDays, pruneWebhookDeliveries } from './prune';
import { generateWebhookSecret } from './secret';

let db: OnyxDatabase;
const orgId = 'org-1';
const now = new Date('2026-07-25T12:00:00.000Z');
const dayMs = 24 * 60 * 60 * 1000;

async function addDelivery(id: string, updatedAt: Date) {
  await db.insert(schema.webhookDelivery).values({
    id,
    endpointId: 'endpoint-1',
    eventId: `evt-${id}`,
    eventType: 'ping',
    payload: '{}',
    status: 'success',
    responseStatus: 200,
    attempts: 1,
    createdAt: updatedAt,
    updatedAt,
  });
}

beforeEach(async () => {
  const sqlite = new Sqlite(':memory:');
  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(schema),
  );
  for (const statement of statements) {
    sqlite.exec(statement);
  }
  db = drizzle(sqlite, { schema }) as unknown as OnyxDatabase;
  setDatabase(db);
  await db.insert(schema.organization).values({
    id: orgId,
    name: 'Org One',
    slug: 'org-one',
    createdAt: now,
  });
  await db.insert(schema.webhookEndpoint).values({
    id: 'endpoint-1',
    organizationId: orgId,
    url: 'https://example.com/hooks',
    secret: generateWebhookSecret(),
    events: '["ping"]',
    enabled: true,
    failureCount: 0,
    createdAt: now,
  });
});

describe('pruneWebhookDeliveries', () => {
  it('removes rows past the retention window and keeps the rest', async () => {
    await addDelivery('old', new Date(now.getTime() - (deliveryRetentionDays + 1) * dayMs));
    await addDelivery('fresh', new Date(now.getTime() - 1 * dayMs));
    await addDelivery('boundary', new Date(now.getTime() - deliveryRetentionDays * dayMs + 1));

    const removed = await pruneWebhookDeliveries(now);

    expect(removed).toBe(1);
    const remaining = await db.query.webhookDelivery.findMany();
    expect(remaining.map((row) => row.id).sort()).toEqual(['boundary', 'fresh']);
  });

  it('is a no-op when nothing is stale', async () => {
    await addDelivery('fresh', now);
    expect(await pruneWebhookDeliveries(now)).toBe(0);
    expect(await db.query.webhookDelivery.findMany()).toHaveLength(1);
  });
});
