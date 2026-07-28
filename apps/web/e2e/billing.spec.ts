import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated } from './helpers';

// Plan state and the guards are driven by the subscription table, so they
// are fully testable without Stripe credentials. Checkout itself talks to
// real Stripe and is exercised locally with the Stripe CLI in sandbox mode
// (see private/billing/README.md), not in CI.

// The seed org (used by the shared signed-in state) is on the paid plan; its
// member limit gives the specs that invite members headroom. Only stable
// facts are asserted: parallel specs may add members to it.
test('seed organization is on the paid plan', async ({ page }) => {
  await gotoHydrated(page, '/app/organization');
  await expect(page.getByText('Current')).toBeVisible();
  await expect(page.getByText('Renews on')).toBeVisible();
  await expect(page.getByText('of 25')).toBeVisible();
  await expect(page.getByText(/API requests this month/)).toBeVisible();
  await expect(page.getByText('Seats billed: 1')).toBeVisible();
});

// The free-plan journey runs in a fresh organization owned by a fresh user
// so it never races the specs that share the seed org.
test.describe('free plan', () => {
  test.use({ storageState: freshStorageState() });

  test('plan state and the member limit', async ({ page }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    const email = `delivered+billing-${stamp}@resend.dev`;

    await test.step('sign up and create an organization', async () => {
      await gotoHydrated(page, '/sign/up');
      await page.getByLabel('Name').fill('Billing Owner');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('a-strong-password');
      await page.getByRole('button', { name: 'Create account' }).click();

      await expect(page.getByText('Create an organization')).toBeVisible();
      await page.getByLabel('Name').fill(`Billing Org ${stamp}`);
      await page.getByRole('button', { name: 'Create organization' }).click();
      await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    });

    await test.step('new organizations start on the free plan', async () => {
      await gotoHydrated(page, '/app/organization');
      await expect(page.getByText('You are on the Free plan.')).toBeVisible();
      await expect(page.getByText('Members: 1 of 3')).toBeVisible();
      await expect(page.getByText('API requests this month: 0 of 1,000')).toBeVisible();
      await expect(page.getByText('1,000 API requests / month')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Upgrade to Paid' })).toBeVisible();
    });

    await test.step('the member limit blocks the third invite', async () => {
      await gotoHydrated(page, '/app/organization');
      for (const label of ['a', 'b']) {
        await page.getByLabel('Invite email').fill(`billing-${label}-${stamp}@example.com`);
        await page.getByRole('button', { name: 'Invite' }).click();
        await expect(page.getByText(`billing-${label}-${stamp}@example.com`)).toBeVisible();
      }
      await page.getByLabel('Invite email').fill(`billing-c-${stamp}@example.com`);
      await page.getByRole('button', { name: 'Invite' }).click();
      await expect(
        page.getByText('The Free plan is limited to 3 members. Upgrade for more.'),
      ).toBeVisible();
    });
  });
});
