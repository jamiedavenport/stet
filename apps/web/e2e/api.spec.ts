import { authErrors } from '@repo/api';
import { brand } from '@repo/brand';
import { seedOrganization, seedUser } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { captchaTestHeader } from './helpers';

// Better Auth rejects state-changing requests without a matching Origin.
const originHeader = { origin: process.env.E2E_BASE_URL ?? 'http://localhost:3000' };

// The contract-declared 401 body, asserted verbatim so drift between the
// contract and the served error surfaces here.
const unauthorizedBody = {
  defined: true,
  code: 'UNAUTHORIZED',
  status: 401,
  message: authErrors.UNAUTHORIZED.message,
};

test('health endpoint is public and cacheable', async ({ request }) => {
  const response = await request.get('/api/v1/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
  expect(response.headers()['cache-control']).toBe('public, max-age=60');
});

// The request fixture carries the signed-in storage state, so this proves a
// session cookie alone does not authenticate the API.
test('org endpoint rejects a session cookie without an API key', async ({ request }) => {
  const response = await request.get('/api/v1/org');
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual(unauthorizedBody);
});

test('org endpoint rejects an invalid API key', async ({ request }) => {
  const response = await request.get('/api/v1/org', {
    headers: { 'x-api-key': 'stet_not_a_real_key' },
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual(unauthorizedBody);
});

test('org endpoint rejects a session bearer token', async ({ request }) => {
  const signIn = await request.post('/api/auth/sign-in/email', {
    data: { email: seedUser.email, password: seedUser.password },
    headers: { ...originHeader, ...captchaTestHeader },
  });
  expect(signIn.status()).toBe(200);
  const token = signIn.headers()['set-auth-token'];
  expect(token).toBeTruthy();

  const response = await request.get('/api/v1/org', {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual(unauthorizedBody);
});

test('an organization API key resolves its organization', async ({ request }) => {
  // The signed-in seed user mints a key for the seeded org; the api-key
  // plugin checks org membership before allowing this.
  const created = await request.post('/api/auth/api-key/create', {
    data: { name: 'e2e-key', organizationId: seedOrganization.id },
    headers: originHeader,
  });
  expect(created.status()).toBe(200);
  const key = (await created.json()) as { key: string; referenceId: string };
  expect(key.key.startsWith(`${brand.slug}_`)).toBe(true);
  expect(key.referenceId).toBe(seedOrganization.id);

  const response = await request.get('/api/v1/org', {
    headers: { 'x-api-key': key.key },
  });
  expect(response.status()).toBe(200);
  // Organization-keyed responses must never land in a shared cache.
  expect(response.headers()['cache-control']).toBe('no-store');

  const organization = (await response.json()) as Record<string, unknown>;
  expect(organization).toMatchObject({
    id: seedOrganization.id,
    name: seedOrganization.name,
    slug: seedOrganization.slug,
  });
  // Wire dates are ISO 8601 strings per the contract.
  expect(typeof organization.createdAt).toBe('string');
  expect(Number.isNaN(Date.parse(organization.createdAt as string))).toBe(false);
});

test('billing endpoint reports the plan and usage, metering its own requests', async ({
  request,
}) => {
  const created = await request.post('/api/auth/api-key/create', {
    data: { name: 'e2e-billing-key', organizationId: seedOrganization.id },
    headers: originHeader,
  });
  expect(created.status()).toBe(200);
  const key = (await created.json()) as { key: string };

  const unauthorized = await request.get('/api/v1/org/billing');
  expect(unauthorized.status()).toBe(401);

  const response = await request.get('/api/v1/org/billing', {
    headers: { 'x-api-key': key.key },
  });
  expect(response.status()).toBe(200);

  // The seed org is on the paid plan (see @repo/db/seed-data).
  const billing = (await response.json()) as Record<string, unknown>;
  expect(billing).toMatchObject({
    plan: 'paid',
    status: 'active',
    cancelAtPeriodEnd: false,
  });
  expect(Number.isNaN(Date.parse(billing.periodEnd as string))).toBe(false);

  const usage = billing.usage as Array<{ feature: string; used: number; cap: number | null }>;
  expect(usage).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ feature: 'members', cap: 25 }),
      expect.objectContaining({ feature: 'apiRequests', cap: 100_000, window: 'month' }),
    ]),
  );
  // The authenticated middleware consumed this very request before the
  // handler ran, so the report always shows at least one API request.
  const apiRequests = usage.find((row) => row.feature === 'apiRequests');
  expect(apiRequests?.used).toBeGreaterThanOrEqual(1);
});
