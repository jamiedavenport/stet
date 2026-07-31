import { expect, test } from '@playwright/test';

// Fresh contexts: the claim under test is what a first-time reader meets.
test.use({ storageState: { cookies: [], origins: [] } });

test('the policy pages render from the config', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.locator('[data-op-section]').first()).toBeVisible();

  await page.goto('/cookies');
  await expect(page.locator('[data-op-section]').first()).toBeVisible();
});

// The site says analytics need no consent banner, which only holds while
// nothing non-essential is stored on a reader's device. A banner here means
// something started asking permission again, and the claim on the front page
// became one a reader could catch us on.
test('a first visit asks for no consent and stores no decision', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Cookies and privacy')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Accept all' })).toHaveCount(0);

  const cookies = await context.cookies();
  expect(cookies.map((cookie) => cookie.name)).not.toContain('stet_consent');
});
