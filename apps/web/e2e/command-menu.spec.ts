import { seedAsset, seedOrganization, seedUser } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { gotoHydrated, pressUntil } from './helpers';

// Runs in the "app" project, already signed in as seedUser in seedOrganization.

function menu(page: Page) {
  return page.getByRole('dialog', { name: 'Command menu' });
}

// Matched without a name: the input's accessible name is its placeholder,
// which changes with the page.
function input(page: Page) {
  return menu(page).getByRole('combobox');
}

async function openMenu(page: Page) {
  await gotoHydrated(page, '/app');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(menu(page)).toBeVisible();
  // Base UI moves focus once the open transition settles, and every keystroke
  // in these specs depends on it having landed.
  await expect(input(page)).toBeFocused();
}

test('Cmd+K opens the menu and Escape closes it', async ({ page }) => {
  await gotoHydrated(page, '/app');

  await pressUntil(page, 'ControlOrMeta+k', async () => {
    await expect(menu(page)).toBeVisible({ timeout: 1000 });
  });
  await expect(input(page)).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();
});

test('destinations are listed with their shortcut and navigate on Enter', async ({ page }) => {
  await openMenu(page);

  const analytics = menu(page).getByRole('option', { name: /Analytics/ });
  await expect(analytics).toContainText('G A');

  await input(page).fill('analytics');
  await expect(analytics).toBeVisible();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/app\/analytics$/);
  await expect(menu(page)).toBeHidden();
});

test('typing filters the static actions', async ({ page }) => {
  await openMenu(page);
  await expect(menu(page).getByRole('option')).not.toHaveCount(0);

  await input(page).fill('sign');

  // Scoped to the group: the seeded workspace is real content, so any word
  // typed here also matches entries, which arrive in their own group.
  const actions = menu(page).getByRole('group', { name: 'Actions' });
  await expect(actions.getByRole('option')).toHaveCount(1);
  await expect(actions.getByRole('option', { name: 'Sign out' })).toBeVisible();
});

test('unmatchable input reports no results rather than failing', async ({ page }) => {
  await openMenu(page);

  await input(page).fill('nothingmatchesthis');

  await expect(menu(page).getByText('No results found')).toBeVisible();
  await expect(menu(page).getByRole('option')).toHaveCount(0);
});

test('a nested page is opened, then left with Escape and Backspace', async ({ page }) => {
  await openMenu(page);

  await menu(page).getByRole('option', { name: 'Switch organization…' }).click();
  await expect(input(page)).toHaveAttribute('placeholder', 'Switch organization…');
  await expect(
    menu(page).getByRole('option', { name: new RegExp(seedOrganization.name) }),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(input(page)).toHaveAttribute('placeholder', /jump to a page/);
  // Wait for the root list itself, not just the placeholder: clicking while
  // the groups are still swapping lands on an element about to be replaced.
  await expect(menu(page).getByRole('option', { name: 'Sign out' })).toBeVisible();

  await menu(page).getByRole('option', { name: 'Switch organization…' }).click();
  await expect(input(page)).toHaveAttribute('placeholder', 'Switch organization…');

  await page.keyboard.press('Backspace');
  await expect(input(page)).toHaveAttribute('placeholder', /jump to a page/);
});

test('full-text search finds a file by a prefix of its name', async ({ page }) => {
  await openMenu(page);

  // "quar" is a prefix of no whole word in the name, so only the FTS5 index
  // can produce this hit.
  await input(page).fill('quar');

  const hit = menu(page).getByRole('option', { name: new RegExp(seedAsset.name) });
  await expect(hit).toBeVisible();
  await expect(hit).toContainText('application/pdf');
});

test('full-text search finds a member of the active organization', async ({ page }) => {
  await openMenu(page);

  await input(page).fill(seedUser.email);

  const hit = menu(page).getByRole('option', { name: new RegExp(seedUser.name) });
  await expect(hit).toBeVisible();
  await expect(hit).toContainText(seedUser.email);
});

test('search does not reach outside the active organization', async ({ page }) => {
  await openMenu(page);

  // The FTS index spans the whole user table, so "Seed" matches the platform
  // admin too; only the membership join keeps them out of these results.
  await input(page).fill('Seed');

  await expect(menu(page).getByRole('option', { name: new RegExp(seedUser.name) })).toBeVisible();
  await expect(menu(page).getByRole('option', { name: /Seed Admin/ })).toHaveCount(0);
});

test('G then A jumps to a page without the menu', async ({ page }) => {
  await gotoHydrated(page, '/app');

  // The whole sequence retries: a leader key swallowed before the listener
  // binds leaves the follow-up as a stray keystroke rather than a jump.
  await pressUntil(page, 'g', async () => {
    await page.keyboard.press('a');
    await expect(page).toHaveURL(/\/app\/analytics$/, { timeout: 1000 });
  });
});
