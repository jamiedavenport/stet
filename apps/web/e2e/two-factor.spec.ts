import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated, signOutButton } from './helpers';
import { totpCode } from './totp';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// A fresh user and org so enabling two-factor never disturbs the shared seed
// session other specs rely on.
test.use({ storageState: freshStorageState() });

test('two-factor enrolment gates sign-in behind a TOTP or backup code', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const email = `delivered+totp-${stamp}@resend.dev`;
  const password = 'a-strong-password';

  await test.step('sign up and create an organization', async () => {
    await gotoHydrated(page, '/sign/up');
    await page.getByLabel('Name').fill('Totp User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Create an organization')).toBeVisible();
    await page.getByLabel('Name').fill(`Totp Org ${stamp}`);
    await page.getByRole('button', { name: 'Create organization' }).click();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  });

  // Enrol through the HTTP API: the QR code on the settings page encodes the
  // secret as an image, so the UI cannot hand it to the test. The page's
  // session cookies back these requests, and the verify call completes the
  // same two-step enrolment the settings card performs.
  const { totpURI, backupCodes } = await test.step('enrol via the two-factor API', async () => {
    const enable = await page.request.post('/api/auth/two-factor/enable', {
      data: { password },
      headers: { origin },
    });
    expect(enable.ok()).toBe(true);
    const body = (await enable.json()) as { totpURI: string; backupCodes: string[] };

    const verify = await page.request.post('/api/auth/two-factor/verify-totp', {
      data: { code: totpCode(body.totpURI) },
      headers: { origin },
    });
    expect(verify.ok()).toBe(true);
    return body;
  });

  await test.step('the settings card shows two-factor as on', async () => {
    await gotoHydrated(page, '/app/settings');
    await expect(page.getByText('Two-factor authentication is on.')).toBeVisible();
  });

  await test.step('sign-in stops at the second factor and keeps the redirect', async () => {
    await signOutButton(page).click();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await gotoHydrated(page, '/sign/in?redirect=/app/organization');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/sign\/2fa\?redirect=/);
    await page.getByLabel('Authentication code').fill(totpCode(totpURI));
    await page.getByRole('button', { name: 'Verify' }).click();

    await expect(page).toHaveURL(/\/app\/organization/);
    await expect(page.getByText('People with access to')).toBeVisible();
  });

  await test.step('a backup code also completes sign-in', async () => {
    await signOutButton(page).click();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/sign\/2fa/);
    await page.getByRole('button', { name: 'Use a backup code' }).click();
    await page.getByLabel('Backup code').fill(backupCodes[0]);
    await page.getByRole('button', { name: 'Verify' }).click();

    // Signing out of /app/organization put its path in the redirect param, so
    // this sign-in lands back there; assert the signed-in shell, not a page.
    await expect(signOutButton(page)).toBeVisible();
    await expect(page).toHaveURL(/\/app/);
  });
});
