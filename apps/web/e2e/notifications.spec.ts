import { seedOrganization } from '@repo/db/seed-data';
import { expect, type Page, test } from '@playwright/test';

import { captchaTestHeader, gotoHydrated, setCheckedUntil } from './helpers';

// Drives a second user through sign-up and invitation acceptance entirely
// over the API while the seed user's page stays open, covering the whole
// pipeline: organization hook -> queue -> delivery job fan-out -> D1 row ->
// hub WebSocket nudge -> live badge, then read state.
test('a member joining notifies everyone else live', async ({ page, playwright }) => {
  const baseURL = test.info().project.use.baseURL;
  if (baseURL === undefined) {
    throw new Error('baseURL missing from Playwright project config');
  }
  // Unique per run so retries and re-runs against the same database never
  // collide on the invitation email.
  const joinerEmail = `join-${Date.now()}@example.com`;
  const joinerName = 'Join Tester';

  await gotoHydrated(page, '/app');
  const bell = page.getByRole('button', { name: 'Notifications' });
  await expect(bell).toBeVisible();

  // page.request shares the seed user's session, so the invite comes from
  // the signed-in owner.
  const inviteResponse = await page.request.post('/api/auth/organization/invite-member', {
    data: { email: joinerEmail, role: 'member' },
    headers: { origin: baseURL },
  });
  expect(inviteResponse.ok()).toBe(true);
  const invitation = (await inviteResponse.json()) as { id: string };

  // Fresh context: the joiner must not inherit the seed user's cookies.
  const joiner = await playwright.request.newContext({ baseURL });
  const signUpResponse = await joiner.post('/api/auth/sign-up/email', {
    data: { name: joinerName, email: joinerEmail, password: 'join-password-123' },
    headers: { origin: baseURL, ...captchaTestHeader },
  });
  expect(signUpResponse.ok()).toBe(true);
  const acceptResponse = await joiner.post('/api/auth/organization/accept-invitation', {
    data: { invitationId: invitation.id },
    headers: { origin: baseURL },
  });
  expect(acceptResponse.ok()).toBe(true);
  await joiner.dispose();

  // No reload: the badge appears through the hub WebSocket nudge alone. The
  // queue consumer runs in-process moments after the accept, so allow a
  // little slack but far less than any polling interval.
  await expect(bell.getByText(/\d/)).toBeVisible({ timeout: 10_000 });

  await bell.click();
  const menu = page.getByRole('menu');
  await expect(menu).toContainText(`${joinerName} joined ${seedOrganization.name}`);

  await menu.getByRole('button', { name: 'Mark all read' }).click();
  await expect(bell.getByText(/\d/)).toHaveCount(0);
});

// Preference rows are exceptions on top of the registry defaults; the
// checkbox state must survive a reload to prove the upsert round-trips.
test.describe('email channel preference', () => {
  const emailToggle = (page: Page) => page.getByLabel('Someone joins your organization by email');

  // Failing part-way leaves the seed user opted out, and the opening
  // assertion of every retry then rejects that state, burying the real
  // failure under a more confusing one.
  test.afterEach(async ({ page }) => {
    await gotoHydrated(page, '/app/settings');
    await setCheckedUntil(emailToggle(page), true);
  });

  test('persists across reloads', async ({ page }) => {
    await gotoHydrated(page, '/app/settings');
    await expect(emailToggle(page)).toBeChecked();

    await setCheckedUntil(emailToggle(page), false);
    await gotoHydrated(page, '/app/settings');
    await expect(emailToggle(page)).not.toBeChecked();

    await setCheckedUntil(emailToggle(page), true);
    // Reloading rather than trusting the render is the whole point: a click
    // that never reached the server renders identically to one that did.
    await gotoHydrated(page, '/app/settings');
    await expect(emailToggle(page)).toBeChecked();
  });
});
