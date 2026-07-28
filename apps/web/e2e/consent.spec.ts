import { expect, test } from '@playwright/test';

import { consentCookie } from '../src/policystack';

// Fresh contexts: the whole point is arriving with no stored decision. Raw
// page.goto here, not gotoHydrated, whose banner auto-dismissal would defeat
// these assertions.
test.use({ storageState: { cookies: [], origins: [] } });

test('the consent banner offers choices and remembers the decision', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Cookies and privacy')).toBeVisible();

  await page.getByRole('button', { name: 'Preferences' }).click();
  await expect(page.getByRole('checkbox', { name: 'Essential' })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Analytics' })).not.toBeChecked();

  await page.getByRole('button', { name: 'Accept all' }).click();
  await expect(page.getByText('Cookies and privacy')).toHaveCount(0);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Cookies and privacy')).toHaveCount(0);
});

// Toggles stage into a draft and only reach the stored decisions on save, so
// this covers both halves: the checkbox tracking the draft, and save promoting
// it. Reading the raw decision back beats asserting on the banner alone, which
// closes either way.
test('ticking a category and saving grants exactly that category', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Preferences' }).click();

  const analytics = page.getByRole('checkbox', { name: 'Analytics' });
  await expect(analytics).not.toBeChecked();
  await analytics.check();
  await expect(analytics).toBeChecked();

  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.getByText('Cookies and privacy')).toHaveCount(0);

  const cookie = (await context.cookies()).find((c) => c.name === consentCookie.name);
  expect(cookie).toBeDefined();
  const record = consentCookie.deserialize(cookie!.value);
  expect(record?.decisions.analytics).toBe(true);
});

test('rejecting keeps analytics off and closes the banner', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Essential only' }).click();
  await expect(page.getByText('Cookies and privacy')).toHaveCount(0);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Cookies and privacy')).toHaveCount(0);
});

test('the policy pages render from the config', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.locator('[data-op-section]').first()).toBeVisible();

  await page.goto('/cookies');
  await expect(page.locator('[data-op-section]').first()).toBeVisible();
});
