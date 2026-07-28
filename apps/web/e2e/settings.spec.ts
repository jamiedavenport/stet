import path from 'node:path';

import { expect, test } from '@playwright/test';

import { accountMenuButton, freshStorageState, gotoHydrated, signIn, signOut } from './helpers';

const fixture = path.join(import.meta.dirname, 'fixtures/avatar.png');

// These tests mutate the seed user's avatar, so they must not interleave.
test.describe.configure({ mode: 'serial' });

test('uploading a profile photo shows it across the app', async ({ page }) => {
  await gotoHydrated(page, '/app/settings');

  await page.getByLabel('Choose profile photo').setInputFiles(fixture);
  // Remove appears once the account carries an image, so waiting on it keeps
  // the assertions below about serving rather than upload latency.
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();

  // Base UI's Avatar only swaps in the <img> once it loads, so visibility
  // proves the serving route returned real image bytes.
  const avatarImage = page.locator('img[src*="/api/files/"]').first();
  await expect(avatarImage).toBeVisible();

  // Not asserted as a specific type: the avatar is requested through a
  // transform, which the binding may satisfy as WebP or decline, leaving PNG.
  const src = await avatarImage.getAttribute('src');
  if (src === null) {
    throw new Error('Avatar image has no src');
  }
  const response = await page.request.get(src);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\//);

  // The sidebar footer avatar picks up the new photo too.
  await expect(accountMenuButton(page).locator('img[src*="/api/files/"]')).toBeVisible();
});

test('removing the profile photo falls back to initials', async ({ page }) => {
  await gotoHydrated(page, '/app/settings');

  await page.getByLabel('Choose profile photo').setInputFiles(fixture);
  await expect(page.locator('img[src*="/api/files/"]').first()).toBeVisible();

  await page.getByRole('button', { name: 'Remove' }).first().click();

  await expect(page.locator('img[src*="/api/files/"]')).toHaveCount(0);
});

test('rejects files that are not supported images', async ({ page }) => {
  await gotoHydrated(page, '/app/settings');

  await page.getByLabel('Choose profile photo').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an image'),
  });

  await expect(page.getByText('Choose a JPEG, PNG, or WebP image')).toBeVisible();
});

test('security sections render for the signed-in user', async ({ page }) => {
  await gotoHydrated(page, '/app/settings');

  // Read-only assertions on the seed user so this never races the specs that
  // mutate shared state.
  await expect(page.getByRole('button', { name: 'Update password' })).toBeVisible();
  await expect(page.getByText('Two-factor authentication is off.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
  await expect(page.getByText('No social providers are configured.')).toBeVisible();
  // Every signed-in user has at least their current session listed.
  await expect(page.getByText('This device')).toBeVisible();
});

// A fresh user and org so changing the password never disturbs the shared
// seed session other specs rely on.
test.describe('password', () => {
  test.use({ storageState: freshStorageState() });

  test('a new user can change their password and sign in with it', async ({ page }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const email = `delivered+password-${stamp}@resend.dev`;

    await test.step('sign up and create an organization', async () => {
      await gotoHydrated(page, '/sign/up');
      await page.getByLabel('Name').fill('Password User');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('original-password');
      await page.getByRole('button', { name: 'Create account' }).click();

      await expect(page.getByText('Create an organization')).toBeVisible();
      await page.getByLabel('Name').fill(`Password Org ${stamp}`);
      await page.getByRole('button', { name: 'Create organization' }).click();
      await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    });

    await test.step('change the password', async () => {
      await gotoHydrated(page, '/app/settings');
      await page.getByLabel('Current password').fill('original-password');
      await page.getByLabel('New password').fill('updated-password');
      await page.getByRole('button', { name: 'Update password' }).click();
      await expect(page.getByText('Password updated')).toBeVisible();
    });

    await test.step('sign in with the new password', async () => {
      await signOut(page);
      await expect(page.getByText('Welcome back')).toBeVisible();
      await signIn(page, email, 'updated-password');
      await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    });
  });
});
