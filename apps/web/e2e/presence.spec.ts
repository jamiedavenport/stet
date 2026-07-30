import { expect, test } from '@playwright/test';

import { gotoHydrated } from './helpers';

// Runs in the "app" project with the seeded user's storage state. Presence is
// driven by Yjs awareness, which always includes the local client, so the
// avatar stack should appear as soon as the WebSocket connects.
test('page presence shows the current user', async ({ page }) => {
  await gotoHydrated(page, '/app');

  const presence = page.getByLabel('People active on this page');
  await expect(presence).toBeVisible();
  await expect(presence.getByText('SU')).toBeVisible();
});

// Client-side navigation swaps the provider to the new page's room, so
// presence must come back up in the room the user landed in.
test('presence survives client-side navigation', async ({ page }) => {
  await gotoHydrated(page, '/app');
  const presence = page.getByLabel('People active on this page');
  await expect(presence.getByText('SU')).toBeVisible();

  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByText('How every entry performs')).toBeVisible();
  await expect(presence.getByText('SU')).toBeVisible();
});

// The header's avatar stack is who is here, yourself included. Presence in
// the table is other people: the entry page and its body editor join the
// collection's room too, so without excluding yourself by id you appear in
// your own table, in as many places as you have tabs.
test('the table never marks you as another person', async ({ page, context }) => {
  await gotoHydrated(page, '/app/c/posts');
  await expect(page.getByRole('row').filter({ hasText: 'Hello World' })).toBeVisible();

  const other = await context.newPage();
  await gotoHydrated(other, '/app/c/posts/seed-entry-hello/body');
  await expect(other.getByLabel('Body body')).toBeVisible();
  // Presence arrives over the room's socket, so give it time to be wrong.
  await page.waitForTimeout(3000);

  await expect(page.locator('[title$="is editing"], [title$="is here"]')).toHaveCount(0);
});

test('presence rooms are scoped per page', async ({ page, context }) => {
  await gotoHydrated(page, '/app');
  await expect(page.getByLabel('People active on this page')).toBeVisible();

  // A second tab on a different page joins a different room; both tabs keep
  // showing their own presence independently.
  const other = await context.newPage();
  await gotoHydrated(other, '/app/organization');
  await expect(other.getByLabel('People active on this page')).toBeVisible();
  await expect(page.getByLabel('People active on this page')).toBeVisible();
});
