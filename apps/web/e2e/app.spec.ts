import { seedContent, seedOrganization, seedUser } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { accountMenuButton, gotoHydrated } from './helpers';

// Runs in the "app" project, which loads the storage state saved by
// auth.setup.ts — no sign-in steps needed here.
test('persisted auth state keeps the user signed in', async ({ page }) => {
  await page.goto('/app');

  await expect(page.getByText(`Signed in as ${seedUser.email}`)).toBeVisible();
  await expect(accountMenuButton(page)).toBeVisible();
});

test('org switcher shows the active organization', async ({ page }) => {
  await gotoHydrated(page, '/app');

  await page.getByRole('button', { name: new RegExp(seedOrganization.name) }).click();
  await expect(
    page.getByRole('menuitem', { name: new RegExp(seedOrganization.name) }),
  ).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'New organization' })).toBeVisible();
});

test('home lists recently edited entries with editor metadata', async ({ page }) => {
  await gotoHydrated(page, '/app');

  await expect(page.getByRole('heading', { name: 'Recently edited' })).toBeVisible();
  // The seeded posts carry authors, so at least one card names its editor
  // and links into the entry editor.
  await expect(page.locator('a[href^="/app/c/posts/"]').first()).toBeVisible();
  await expect(page.getByText('Edited by').first()).toBeVisible();
});

test('home shows the analytics snapshot with a link to the dashboard', async ({ page }) => {
  await gotoHydrated(page, '/app');

  await expect(page.getByRole('heading', { name: 'Last 7 days' })).toBeVisible();
  // Base UI keeps the button role on the rendered link element.
  await page.getByRole('button', { name: 'View analytics' }).click();
  await page.waitForURL('**/app/analytics');
});

test('quick actions create an entry and open its editor', async ({ page }) => {
  await gotoHydrated(page, '/app');

  await page.getByRole('button', { name: `New in ${seedContent.posts.name}` }).click();

  await page.waitForURL(`**/app/c/${seedContent.posts.slug}/**`);
  await expect(page.getByRole('main').getByText('Untitled').first()).toBeVisible();
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
