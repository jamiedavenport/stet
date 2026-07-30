import { seedApiKey, seedOrganization } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { gotoHydrated } from './helpers';

// The whole surface in one pass: the page lists the organization's keys, the
// key it mints authenticates against the public API, and revoking it takes
// that access away again.
test('a key is minted, shown once, and revoked', async ({ page, request }) => {
  await gotoHydrated(page, '/app/developers/keys');
  await expect(page.getByText(seedApiKey.name)).toBeVisible();

  await page.getByLabel('Key name').fill('e2e key');
  await page.getByRole('button', { name: 'Create key' }).click();

  const revealed = page.getByTestId('new-api-key');
  await expect(revealed).toBeVisible();
  const key = await revealed.innerText();

  const authorized = await request.get('/api/v1/org', { headers: { 'x-api-key': key } });
  expect(authorized.status()).toBe(200);
  expect(await authorized.json()).toMatchObject({ id: seedOrganization.id });

  // Only the hash is stored, so dismissing the panel is the last sight of it:
  // the row left behind carries the opening characters and nothing more.
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(key)).toHaveCount(0);

  const row = page.locator('li').filter({ hasText: 'e2e key' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Revoke', exact: true }).click();
  await row.getByRole('button', { name: 'Yes, revoke' }).click();
  await expect(page.locator('li').filter({ hasText: 'e2e key' })).toHaveCount(0);

  const revoked = await request.get('/api/v1/org', { headers: { 'x-api-key': key } });
  expect(revoked.status()).toBe(401);
});
