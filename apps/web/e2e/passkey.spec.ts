import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated, signOutButton } from './helpers';

// Passkey flows start signed out and drive WebAuthn through Chromium's
// virtual authenticator (CDP), so no real platform authenticator is needed.
test.use({ storageState: freshStorageState() });

test('a passkey registers in settings and signs the user back in', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const email = `delivered+passkey-${stamp}@resend.dev`;

  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await test.step('sign up and create an organization', async () => {
    await gotoHydrated(page, '/sign/up');
    await page.getByLabel('Name').fill('Passkey User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Create an organization')).toBeVisible();
    await page.getByLabel('Name').fill(`Passkey Org ${stamp}`);
    await page.getByRole('button', { name: 'Create organization' }).click();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  });

  await test.step('register a passkey from the settings card', async () => {
    await gotoHydrated(page, '/app/settings');
    await expect(page.getByText("You haven't added any passkeys yet.")).toBeVisible();
    await page.getByRole('button', { name: 'Add a passkey' }).click();

    await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();
  });

  await test.step('sign back in with the passkey', async () => {
    await signOutButton(page).click();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await page.getByRole('button', { name: 'Sign in with a passkey' }).click();
    await expect(signOutButton(page)).toBeVisible();
  });

  await test.step('remove the passkey', async () => {
    await gotoHydrated(page, '/app/settings');
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByText("You haven't added any passkeys yet.")).toBeVisible();
  });
});
