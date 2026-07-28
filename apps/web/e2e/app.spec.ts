import { seedOrganization, seedUser } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { gotoHydrated, signOutButton } from './helpers';

// Runs in the "app" project, which loads the storage state saved by
// auth.setup.ts — no sign-in steps needed here.
test('persisted auth state keeps the user signed in', async ({ page }) => {
  await page.goto('/app');

  await expect(page.getByText(`Signed in as ${seedUser.email}`)).toBeVisible();
  await expect(signOutButton(page)).toBeVisible();
});

test('org switcher shows the active organization', async ({ page }) => {
  await gotoHydrated(page, '/app');

  await page.getByRole('button', { name: new RegExp(seedOrganization.name) }).click();
  await expect(
    page.getByRole('menuitem', { name: new RegExp(seedOrganization.name) }),
  ).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'New organization' })).toBeVisible();
});

test('inviting a member shows a pending invitation', async ({ page }) => {
  const email = `invitee-${Date.now()}@example.com`;

  await gotoHydrated(page, '/app/organization');
  // Scoped to main: the sidebar footer also shows the seed user's email.
  await expect(page.getByRole('main').getByText(seedUser.email)).toBeVisible();

  await page.getByLabel('Invite email').fill(email);
  await page.getByRole('button', { name: 'Invite' }).click();

  await expect(page.getByText(email)).toBeVisible();
});
