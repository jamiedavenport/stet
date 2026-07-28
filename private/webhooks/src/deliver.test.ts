import { eq, schema, setDatabase } from '@repo/db';
import type { Database as OnyxDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { deliverWebhookEvent, disableAfterConsecutiveFailures, subscribedEvents } from './deliver';
import { generateWebhookSecret } from './secret';

// The delivery job runs real drizzle queries, so it is tested against a real
// in-memory sqlite database with the actual schema pushed into it; only
// fetch is stubbed.

let db: OnyxDatabase;
let rowCounter = 0;
const orgId = 'org-1';
const now = new Date();

const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>();

function eventInput(overrides: { id?: string; endpointId?: string } = {}) {
  return {
    id: overrides.id ?? 'evt-1',
    organizationId: orgId,
    type: 'ping' as const,
    payload: { message: 'hello' },
    timestamp: now.toISOString(),
    endpointId: overrides.endpointId,
  };
}

async function addEndpoint(overrides: Partial<typeof schema.webhookEndpoint.$inferInsert> = {}) {
  rowCounter = rowCounter + 1;
  const id = overrides.id ?? `endpoint-${rowCounter}`;
  await db.insert(schema.webhookEndpoint).values({
    id,
    organizationId: orgId,
    url: `https://example.com/${id}`,
    secret: generateWebhookSecret(),
    events: JSON.stringify(['ping']),
    enabled: true,
    failureCount: 0,
    createdAt: now,
    ...overrides,
  });
  return id;
}

async function endpointRow(id: string) {
  const row = await db.query.webhookEndpoint.findFirst({
    where: eq(schema.webhookEndpoint.id, id),
  });
  if (row === undefined) {
    throw new Error(`endpoint ${id} missing`);
  }
  return row;
}

async function deliveryRows() {
  return db.query.webhookDelivery.findMany();
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
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

describe('deliverWebhookEvent', () => {
  it('POSTs the signed event to subscribed endpoints and records success', async () => {
    const endpointId = await addEndpoint();
    await deliverWebhookEvent(eventInput());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://example.com/${endpointId}`);
    const headers = init.headers as Record<string, string>;
    expect(headers['webhook-id']).toBe('evt-1');
    expect(headers['webhook-signature']).toMatch(/^v1,/);
    expect(JSON.parse(init.body as string)).toEqual({
      type: 'ping',
      timestamp: now.toISOString(),
      data: { message: 'hello' },
    });

    const rows = await deliveryRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('success');
    expect(rows[0].responseStatus).toBe(200);
    expect(rows[0].attempts).toBe(1);
  });

  it('skips endpoints not subscribed to the event and disabled endpoints', async () => {
    await addEndpoint({ events: JSON.stringify(['member.joined']) });
    await addEndpoint({ enabled: false });
    await deliverWebhookEvent(eventInput());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await deliveryRows()).toHaveLength(0);
  });

  it('targets a single endpoint regardless of subscriptions for test sends', async () => {
    const target = await addEndpoint({ events: JSON.stringify([]) });
    await addEndpoint();
    await deliverWebhookEvent(eventInput({ endpointId: target }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://example.com/${target}`);
  });

  it('records a failure, bumps the failure counter, and throws for the retry', async () => {
    const endpointId = await addEndpoint();
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(deliverWebhookEvent(eventInput())).rejects.toThrow('1 of 1');
    const rows = await deliveryRows();
    expect(rows[0].status).toBe('failed');
    expect(rows[0].responseStatus).toBe(500);
    expect((await endpointRow(endpointId)).failureCount).toBe(1);
  });

  it('retries only endpoints that have not succeeded yet', async () => {
    const failing = await addEndpoint();
    const succeeding = await addEndpoint();
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(new Response(null, { status: url.includes(failing) ? 500 : 200 })),
    );
    await expect(deliverWebhookEvent(eventInput())).rejects.toThrow();

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await deliverWebhookEvent(eventInput());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://example.com/${failing}`);
    const rows = await deliveryRows();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === 'success')).toBe(true);
    const retried = rows.find((row) => row.endpointId === failing);
    expect(retried?.attempts).toBe(2);
    expect((await endpointRow(succeeding)).failureCount).toBe(0);
  });

  it('resets the failure counter on success', async () => {
    const endpointId = await addEndpoint({ failureCount: 3 });
    await deliverWebhookEvent(eventInput());
    expect((await endpointRow(endpointId)).failureCount).toBe(0);
  });

  it('disables an endpoint at the consecutive-failure threshold without throwing', async () => {
    const endpointId = await addEndpoint({
      failureCount: disableAfterConsecutiveFailures - 1,
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    await deliverWebhookEvent(eventInput());
    const endpoint = await endpointRow(endpointId);
    expect(endpoint.enabled).toBe(false);
    expect(endpoint.failureCount).toBe(disableAfterConsecutiveFailures);
  });

  it('disables an endpoint immediately on 410 Gone', async () => {
    const endpointId = await addEndpoint();
    fetchMock.mockResolvedValue(new Response(null, { status: 410 }));
    await deliverWebhookEvent(eventInput());
    expect((await endpointRow(endpointId)).enabled).toBe(false);
  });

  it('redelivers a failed event to one endpoint, reusing its ledger row', async () => {
    const endpointId = await addEndpoint();
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    await expect(deliverWebhookEvent(eventInput())).rejects.toThrow();

    // What redeliverWebhookEvent() puts back on the queue: same event id,
    // same timestamp, targeted at the endpoint.
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await deliverWebhookEvent(eventInput({ endpointId }));

    const rows = await deliveryRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('success');
    expect(rows[0].attempts).toBe(2);
  });

  it('records network errors as failures with no response status', async () => {
    await addEndpoint();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(deliverWebhookEvent(eventInput())).rejects.toThrow();
    const rows = await deliveryRows();
    expect(rows[0].status).toBe('failed');
    expect(rows[0].responseStatus).toBeNull();
  });
});

describe('subscribedEvents', () => {
  it('parses a JSON array of strings', () => {
    expect(subscribedEvents('["ping","member.joined"]')).toEqual(['ping', 'member.joined']);
  });

  it('returns nothing for malformed values', () => {
    expect(subscribedEvents('not json')).toEqual([]);
    expect(subscribedEvents('{"a":1}')).toEqual([]);
    expect(subscribedEvents('[1,2]')).toEqual([]);
  });
});
