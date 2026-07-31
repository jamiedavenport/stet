import { expect, test } from '@playwright/test';

import {
  captchaTestHeader,
  freshStorageState,
  gotoHydrated,
  ownRateLimitBucket,
  signIn,
} from './helpers';
import { waitForEmailLink } from './mail';

// Recipients use Resend's test addresses (delivered@resend.dev plus a label),
// which are safe to send to if a real API key is ever configured:
// https://resend.com/docs/knowledge-base/what-email-addresses-to-use-for-testing
// The unique label also keys each test's emails in the server log.

// Signed out, with consent pre-accepted so the banner never overlays the
// auth flows under test.
test.use({ storageState: freshStorageState() });

test('sign up sends a verification email whose link verifies the address', async ({ page }) => {
  const email = `delivered+verify-${Date.now()}@resend.dev`;

  await gotoHydrated(page, '/sign/up');
  await page.getByLabel('Name').fill('Verify Flow Test');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-strong-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Create an organization')).toBeVisible();

  const before = await page.request.get('/api/auth/get-session?disableCookieCache=true');
  expect((await before.json()).user.emailVerified).toBe(false);

  const verifyLink = await waitForEmailLink('email verification', email);
  await page.goto(verifyLink);

  const after = await page.request.get('/api/auth/get-session?disableCookieCache=true');
  expect((await after.json()).user.emailVerified).toBe(true);
});

test('password reset flow replaces the password', async ({ page, request }) => {
  // Three widget-gated forms in sequence (forgot, then two sign-ins) put the
  // flow past the default timeout when Turnstile is configured.
  test.setTimeout(120_000);
  const email = `delivered+reset-${Date.now()}@resend.dev`;

  // Create the account through the API so the page stays signed out (the
  // /sign routes redirect authenticated visitors).
  const signUp = await request.post('/api/auth/sign-up/email', {
    data: { name: 'Reset Flow Test', email, password: 'old-password-123' },
    headers: {
      origin: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
      ...captchaTestHeader,
      ...ownRateLimitBucket('203.0.113.21'),
    },
  });
  expect(signUp.ok()).toBe(true);

  await gotoHydrated(page, '/sign/in');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  // Wait for the forgot page to mount: the sign-in page has an identically
  // labeled Email field that would otherwise swallow the fill mid-navigation.
  await expect(page.getByText('Forgot your password?')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await expect(page.getByLabel('Email')).toHaveValue(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();

  const resetLink = await waitForEmailLink('password reset', email);
  await gotoHydrated(page, resetLink);
  await page.getByLabel('New password').fill('new-password-456');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Password updated')).toBeVisible();

  // The old password no longer works…
  await signIn(page, email, 'old-password-123');
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();

  // …and the new one signs in (fresh accounts land on the create-org page).
  await signIn(page, email, 'new-password-456');
  await expect(page.getByText('Create an organization')).toBeVisible();
});

test('reset page without a token shows the invalid-link state', async ({ page }) => {
  await gotoHydrated(page, '/sign/reset');
  await expect(page.getByText('Reset link invalid')).toBeVisible();

  await page.getByRole('link', { name: 'Request a new reset link' }).click();
  await expect(page).toHaveURL(/\/sign\/forgot/);
});

test('reset link with a bad token redirects to the invalid-link state', async ({ page }) => {
  await page.goto('/api/auth/reset-password/not-a-real-token?callbackURL=%2Fsign%2Freset');

  await expect(page).toHaveURL(/\/sign\/reset\?error=/);
  await expect(page.getByText('Reset link invalid')).toBeVisible();
});
