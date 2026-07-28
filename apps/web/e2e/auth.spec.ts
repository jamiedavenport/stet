import { seedInvitation, seedOrganization, seedUser } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated, signIn, signOut } from './helpers';

// Signed out, with consent pre-accepted so the banner never overlays the
// auth flows under test.
test.use({ storageState: freshStorageState() });

test('sign up creates an account, org, and signs in', async ({ page }) => {
  const email = `delivered+signup-${Date.now()}@resend.dev`;

  await gotoHydrated(page, '/sign/up');
  await page.getByLabel('Name').fill('Sign Up Test');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-strong-password');
  await page.getByRole('button', { name: 'Create account' }).click();

  // New users have no organization yet, so they land on the create-org page.
  await expect(page.getByText('Create an organization')).toBeVisible();
  await page.getByLabel('Name').fill(`Org ${Date.now()}`);
  await page.getByRole('button', { name: 'Create organization' }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});

test('sign in with seeded credentials', async ({ page }) => {
  await signIn(page, seedUser.email, seedUser.password);

  await expect(page.getByText(`Signed in as ${seedUser.email}`)).toBeVisible();
});

test('sign in with wrong password shows an error', async ({ page }) => {
  await signIn(page, seedUser.email, 'not-the-password');

  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/sign\/in/);
});

test('invite link redirects through sign-up and accepts', async ({ page }) => {
  // Signed out, so the invite page bounces to sign-in with a redirect param.
  await gotoHydrated(page, `/invite/${seedInvitation.id}`);
  await expect(page).toHaveURL(/\/sign\/in\?redirect=/);

  await page.getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Name').fill('Invited User');
  await page.getByLabel('Email').fill(seedInvitation.email);
  await page.getByLabel('Password').fill('a-strong-password');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Back on the invite page after sign-up.
  await expect(page.getByText(`Join ${seedOrganization.name}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Accept invitation' }).click();

  await expect(
    page.getByText(`Signed in as ${seedInvitation.email} in ${seedOrganization.name}`),
  ).toBeVisible();
});

test('sign out redirects to the sign-in page', async ({ page }) => {
  await signIn(page, seedUser.email, seedUser.password);
  await expect(page.getByText(`Signed in as ${seedUser.email}`)).toBeVisible();

  await signOut(page);
  await expect(page).toHaveURL(/\/sign\/in/);
});
