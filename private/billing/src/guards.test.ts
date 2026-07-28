import { and, eq, schema, setDatabase } from '@repo/db';
import type { Database as OnyxDatabase } from '@repo/db';
import Sqlite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import {
  ai,
  apiRequests,
  BillingError,
  getSubscription,
  megabyte,
  members,
  storage,
  toPlanName,
  usageReport,
} from './server';

// The guards run real drizzle queries, so they are tested against a real
// in-memory sqlite database with the actual schema pushed into it, injected
// with setDatabase() in place of the worker's ambient D1 binding.

let db: OnyxDatabase;
let rowCounter = 0;

function rowId(): string {
  rowCounter = rowCounter + 1;
  return `row-${rowCounter}`;
}

const orgId = 'org-1';
const now = new Date();

async function addUser(): Promise<string> {
  const userId = rowId();
  await db.insert(schema.user).values({
    id: userId,
    name: userId,
    email: `${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  return userId;
}

async function addMembers(count: number): Promise<void> {
  for (let index = 0; index < count; index = index + 1) {
    await db.insert(schema.member).values({
      id: rowId(),
      organizationId: orgId,
      userId: await addUser(),
      role: index === 0 ? 'owner' : 'member',
      createdAt: now,
    });
  }
}

async function addInvitation(status: string): Promise<void> {
  await db.insert(schema.invitation).values({
    id: rowId(),
    email: `${rowId()}@example.com`,
    inviterId: await addUser(),
    organizationId: orgId,
    status,
    expiresAt: new Date(now.getTime() + 60_000),
    createdAt: now,
  });
}

async function addSubscription(status: string, plan = 'paid'): Promise<void> {
  await db.insert(schema.subscription).values({
    id: rowId(),
    plan,
    referenceId: orgId,
    status,
    createdAt: now,
    updatedAt: now,
  });
}

async function usageRow(meter: string): Promise<{ used: number; period: string } | undefined> {
  const row = await db.query.usage.findFirst({
    where: and(eq(schema.usage.organizationId, orgId), eq(schema.usage.meter, meter)),
  });
  if (row === undefined) {
    return undefined;
  }
  return { used: row.used, period: row.period };
}

async function addAsset(megabytes: number, status = 'uploaded'): Promise<void> {
  const id = rowId();
  await db.insert(schema.asset).values({
    id,
    key: `orgs/${orgId}/${id}`,
    organizationId: orgId,
    uploadedBy: await addUser(),
    kind: 'note-image',
    name: `${id}.png`,
    size: megabytes * megabyte,
    contentType: 'image/png',
    status,
    createdAt: now,
  });
}

async function failure(work: Promise<unknown>): Promise<BillingError> {
  const caught = await work.then(
    () => undefined,
    (error: unknown) => error,
  );
  expect(caught).toBeInstanceOf(BillingError);
  return caught as BillingError;
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
});

async function planOf(organizationId: string): Promise<string> {
  return toPlanName((await getSubscription(organizationId))?.plan);
}

describe('getSubscription and plan resolution', () => {
  it('defaults to the free plan without a subscription', async () => {
    expect(await getSubscription(orgId)).toBeNull();
    expect(await planOf(orgId)).toBe('free');
  });

  it('resolves active and trialing subscriptions to the paid plan', async () => {
    await addSubscription('active');
    expect((await getSubscription(orgId))?.plan).toBe('paid');
    expect(await planOf(orgId)).toBe('paid');
  });

  it('ignores canceled and incomplete subscriptions', async () => {
    await addSubscription('canceled');
    await addSubscription('incomplete');
    expect(await planOf(orgId)).toBe('free');
  });

  it('falls back to free for unknown plan names', async () => {
    await addSubscription('active', 'legacy-plan');
    expect(await planOf(orgId)).toBe('free');
    expect(await ai.can(orgId)).toBe(false);
  });

  it('scopes the lookup to the organization', async () => {
    await addSubscription('active');
    expect(await planOf('org-2')).toBe('free');
  });
});

describe('flag features', () => {
  it('excludes the AI assistant on the free plan', async () => {
    expect(await ai.can(orgId)).toBe(false);
    const error = await failure(ai.require(orgId));
    expect(error.code).toBe('feature-unavailable');
    expect(error.plan).toBe('free');
    expect(error.feature).toBe('ai');
    expect(error.message).toBe('The Paid plan is required for this feature.');
  });

  it('includes the AI assistant on the paid plan', async () => {
    await addSubscription('active');
    expect(await ai.can(orgId)).toBe(true);
    await expect(ai.require(orgId)).resolves.toBeUndefined();
  });
});

describe('counted features', () => {
  it('allows members below the free cap', async () => {
    await addMembers(2);
    expect(await members.can(orgId)).toBe(true);
    await expect(members.require(orgId)).resolves.toBeUndefined();
  });

  it('blocks at the free cap with an upgrade hint', async () => {
    await addMembers(3);
    const error = await failure(members.require(orgId));
    expect(error.code).toBe('limit-reached');
    expect(error.feature).toBe('members');
    expect(error.message).toBe('The Free plan is limited to 3 members. Upgrade for more.');
  });

  it('counts pending invitations and ignores resolved ones', async () => {
    await addMembers(2);
    await addInvitation('accepted');
    await addInvitation('canceled');
    expect(await members.can(orgId)).toBe(true);
    await addInvitation('pending');
    expect(await members.can(orgId)).toBe(false);
  });

  it('checks headroom for more than one unit', async () => {
    await addMembers(1);
    expect(await members.can(orgId, 2)).toBe(true);
    expect(await members.can(orgId, 3)).toBe(false);
  });

  it('lifts the cap on the paid plan and drops the hint at its own cap', async () => {
    await addSubscription('active');
    await addMembers(3);
    await expect(members.require(orgId)).resolves.toBeUndefined();
    await addMembers(22);
    const error = await failure(members.require(orgId));
    expect(error.message).toBe('The Paid plan is limited to 25 members.');
  });

  it('reports the cap per plan', async () => {
    expect(await members.cap(orgId)).toBe(3);
    await addSubscription('active');
    expect(await members.cap(orgId)).toBe(25);
  });
});

describe('metered features', () => {
  it('consumes into the current monthly bucket', async () => {
    await apiRequests.consume(orgId);
    await apiRequests.consume(orgId, 4);
    const row = await usageRow('apiRequests');
    expect(row?.used).toBe(5);
    const start = new Date();
    const period = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(row?.period).toBe(period);
  });

  it('enforces the cap atomically', async () => {
    await apiRequests.consume(orgId, 999);
    await apiRequests.consume(orgId);
    const error = await failure(apiRequests.consume(orgId));
    expect(error.code).toBe('limit-reached');
    expect((await usageRow('apiRequests'))?.used).toBe(1000);
  });

  it('rejects a first consumption beyond the cap', async () => {
    await failure(apiRequests.consume(orgId, 1_001));
    expect(await usageRow('apiRequests')).toBeUndefined();
  });

  it('answers can() from remaining headroom', async () => {
    await apiRequests.consume(orgId, 998);
    expect(await apiRequests.can(orgId, 2)).toBe(true);
    expect(await apiRequests.can(orgId, 3)).toBe(false);
  });

  it('scopes counters to the organization', async () => {
    await apiRequests.consume(orgId, 7);
    await db.insert(schema.organization).values({
      id: 'org-2',
      name: 'Org Two',
      slug: 'org-two',
      createdAt: now,
    });
    await apiRequests.consume('org-2', 2);
    expect((await usageRow('apiRequests'))?.used).toBe(7);
  });
});

describe('the storage quota', () => {
  it('counts pending reservations as well as uploaded bytes', async () => {
    await addAsset(4);
    await addAsset(95, 'pending');
    expect(await usageReport(orgId)).toContainEqual({
      feature: 'storage',
      used: 99,
      cap: 100,
      window: null,
    });
  });

  it('holds headroom for in-flight uploads', async () => {
    await addAsset(99, 'pending');
    expect(await storage.can(orgId, 1)).toBe(true);
    expect(await storage.can(orgId, 2)).toBe(false);
  });

  it('rounds the total up once rather than each file', async () => {
    await addAsset(0.25);
    await addAsset(0.25);
    expect(await usageReport(orgId)).toContainEqual({
      feature: 'storage',
      used: 1,
      cap: 100,
      window: null,
    });
  });

  it('rejects an upload that would cross the plan cap', async () => {
    await addAsset(99);
    expect(await storage.can(orgId, 1)).toBe(true);
    expect(await storage.can(orgId, 2)).toBe(false);
    const error = await failure(storage.require(orgId, 2));
    expect(error.code).toBe('limit-reached');
    expect(error.message).toContain('100 MB of storage');
  });

  it('frees the space again when the file is deleted', async () => {
    await addAsset(100);
    expect(await storage.can(orgId, 1)).toBe(false);
    await db.delete(schema.asset);
    expect(await storage.can(orgId, 1)).toBe(true);
  });
});

describe('usageReport', () => {
  it('reports measured features the plan includes', async () => {
    await addMembers(1);
    await apiRequests.consume(orgId, 12);
    expect(await usageReport(orgId)).toEqual([
      { feature: 'members', used: 1, cap: 3, window: null },
      { feature: 'apiRequests', used: 12, cap: 1_000, window: 'month' },
      { feature: 'storage', used: 0, cap: 100, window: null },
    ]);
  });

  it('reflects the paid caps and skips nothing it should include', async () => {
    await addSubscription('active');
    await addMembers(2);
    expect(await usageReport(orgId)).toEqual([
      { feature: 'members', used: 2, cap: 25, window: null },
      { feature: 'apiRequests', used: 0, cap: 100_000, window: 'month' },
      { feature: 'storage', used: 0, cap: 10_000, window: null },
    ]);
  });
});
