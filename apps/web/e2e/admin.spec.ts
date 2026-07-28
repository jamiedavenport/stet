import { seedAdmin, seedOrganization, seedUser } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import {
  closeAccountMenu,
  freshStorageState,
  gotoHydrated,
  openAccountMenu,
  signIn,
} from './helpers';

// The saved storage state belongs to the regular seed user, which is exactly
// what the first test needs; the admin block signs in for itself.
test('a regular member has no route to the admin panel', async ({ page }) => {
  await gotoHydrated(page, '/app');
  await openAccountMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0);

  await gotoHydrated(page, '/app/admin');
  await expect(page.getByRole('heading', { name: /doesn't exist/ })).toBeVisible();
});

test.describe('platform admin', () => {
  test.use({ storageState: freshStorageState() });

  test.beforeEach(async ({ page }) => {
    await signIn(page, seedAdmin.email, seedAdmin.password);
    await expect(page.getByText(`Signed in as ${seedAdmin.email}`)).toBeVisible();
  });

  test('platform stats and organization search', async ({ page }) => {
    await openAccountMenu(page);
    await page.getByRole('menuitem', { name: 'Admin' }).click();

    for (const label of ['Total users', 'New users', 'Active organizations']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    // Both seed users signed up moments ago, so the tile counts them.
    await expect(page.getByText('Total users').locator('..')).toContainText(/[1-9]/);

    await page.getByRole('link', { name: 'Organizations' }).click();
    await page.getByLabel('Search by name').fill(seedOrganization.name);
    await page.getByRole('main').getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText(seedOrganization.slug, { exact: true })).toBeVisible();

    await page.getByLabel('Search by name').fill('no-such-organization');
    await page.getByRole('main').getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('No organizations found.')).toBeVisible();
  });

  test('banning a user blocks their sign-in until they are unbanned', async ({ page, browser }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const email = `delivered+ban-${stamp}@resend.dev`;
    const password = 'a-strong-password';

    await test.step('a new account signs up', async () => {
      const context = await browser.newContext();
      const fresh = await context.newPage();
      await gotoHydrated(fresh, '/sign/up');
      await fresh.getByLabel('Name').fill('Ban Target');
      await fresh.getByLabel('Email').fill(email);
      await fresh.getByLabel('Password').fill(password);
      await fresh.getByRole('button', { name: 'Create account' }).click();
      await expect(fresh.getByText('Create an organization')).toBeVisible();
      await context.close();
    });

    await gotoHydrated(page, '/app/admin/users');
    await page.getByLabel('Search by email').fill(email);
    await page.getByRole('main').getByRole('button', { name: 'Search' }).click();
    const row = page.getByRole('listitem').filter({ hasText: email });
    await expect(row).toBeVisible();

    await test.step('the admin bans the account with a reason', async () => {
      await row.getByRole('button', { name: 'Ban', exact: true }).click();
      await row.getByLabel('Ban reason (optional)').fill('Spam');
      await row.getByRole('button', { name: 'Yes, ban' }).click();
      await expect(row.getByText('Banned')).toBeVisible();
      await expect(row.getByText('Reason: Spam')).toBeVisible();
    });

    await test.step('the banned account cannot sign in', async () => {
      const context = await browser.newContext();
      const banned = await context.newPage();
      await signIn(banned, email, password);
      await expect(banned.getByText(/suspended/)).toBeVisible();
      await context.close();
    });

    await test.step('unbanning restores sign-in', async () => {
      await row.getByRole('button', { name: 'Unban' }).click();
      await expect(row.getByText('Banned')).toHaveCount(0);

      const context = await browser.newContext();
      const restored = await context.newPage();
      await signIn(restored, email, password);
      await expect(restored.getByText('Create an organization')).toBeVisible();
      await context.close();
    });
  });

  // The route guard only hides the panel. This replays the request the panel
  // makes, with a regular member's cookies, to prove the data is guarded too.
  test('the user list server function rejects a regular member', async ({ page, browser }) => {
    const serverFnUrls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('_serverFn')) {
        serverFnUrls.push(request.url());
      }
    });

    await gotoHydrated(page, '/app/admin/users');
    await expect(page.getByText('Every account on the platform.')).toBeVisible();
    await page.getByLabel('Search by email').fill(seedUser.email);
    await page.getByRole('main').getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('listitem').filter({ hasText: seedUser.email })).toBeVisible();

    const url = serverFnUrls.at(-1);
    expect(url).toBeDefined();

    const member = await browser.newContext({ storageState: 'e2e/.auth/user.json' });
    const denied = await member.request.get(url ?? '');
    expect(denied.ok()).toBe(false);
    expect(await denied.text()).not.toContain(seedUser.email);
    await member.close();
  });

  test('impersonating a user and returning to the admin account', async ({ page }) => {
    test.setTimeout(120_000);

    await gotoHydrated(page, '/app/admin/users');
    await page.getByLabel('Search by email').fill(seedUser.email);
    await page.getByRole('main').getByRole('button', { name: 'Search' }).click();

    const row = page.getByRole('listitem').filter({ hasText: seedUser.email });
    await row.getByRole('button', { name: 'Impersonate' }).click();

    // Impersonation reloads the page; wait for hydration before driving the
    // banner, or the click lands on a button with no handler yet.
    await page.waitForURL('**/app');
    await page.waitForLoadState('networkidle');

    // The impersonated session lands in the app as the target user.
    await expect(page.getByText(`Signed in as ${seedUser.email}`)).toBeVisible();
    await expect(page.getByText(`Viewing as ${seedUser.name}`)).toBeVisible();
    // Impersonation is not a promotion: the target is not platform staff.
    // Settings first, so the absence of Admin is read off an open menu.
    await openAccountMenu(page);
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Admin' })).toHaveCount(0);
    await closeAccountMenu(page);

    await page.getByRole('button', { name: 'Stop impersonating' }).click();
    await expect(page.getByText('Viewing as')).toHaveCount(0);
    await expect(page.getByText('Every account on the platform.')).toBeVisible();
  });
});
