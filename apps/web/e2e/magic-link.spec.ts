import { expect, test } from '@playwright/test';

import { captchaTestHeader, freshStorageState, gotoHydrated } from './helpers';
import { waitForEmailLink } from './mail';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Magic link flows start signed out.
test.use({ storageState: freshStorageState() });

test('an emailed magic link signs in an existing account', async ({ page, request }) => {
  const email = `delivered+magic-${Date.now()}@resend.dev`;

  // Create the account through the API so the page stays signed out (the
  // /sign routes redirect authenticated visitors).
  const signUp = await request.post('/api/auth/sign-up/email', {
    data: { name: 'Magic Link Test', email, password: 'a-strong-password' },
    headers: { origin, ...captchaTestHeader },
  });
  expect(signUp.ok()).toBe(true);

  await gotoHydrated(page, '/sign/in');
  await page.getByRole('link', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByText('Sign in with a link')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();

  const link = await waitForEmailLink('magic link', email);
  await page.goto(link);

  // Fresh accounts have no organization, so /app lands on the create-org step.
  await expect(page.getByText('Create an organization')).toBeVisible();
});

test('an unknown address still gets the sent state', async ({ page }) => {
  await gotoHydrated(page, '/sign/link');
  await page.getByLabel('Email').fill(`delivered+magic-none-${Date.now()}@resend.dev`);
  await page.getByRole('button', { name: 'Send sign-in link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
});

test('an invalid magic link lands on the request page with an error', async ({ page }) => {
  await page.goto(
    '/api/auth/magic-link/verify?token=not-a-real-token&callbackURL=%2Fapp&errorCallbackURL=%2Fsign%2Flink',
  );

  await expect(page).toHaveURL(/\/sign\/link\?error=/);
  await expect(page.getByText('That sign-in link is invalid or has expired')).toBeVisible();
});
