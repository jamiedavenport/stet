import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated, signIn, signOutButton, signUpWithOrg } from './helpers';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Fresh users and orgs: these specs mutate roles and must never touch the
// shared seed organization.
test.use({ storageState: freshStorageState() });

test('member role gates the webhooks surface until promoted', async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const ownerEmail = `delivered+role-owner-${stamp}@resend.dev`;
  const inviteeEmail = `delivered+role-member-${stamp}@resend.dev`;
  const password = 'a-strong-password';

  await signUpWithOrg(page, 'Role Owner', ownerEmail, `Role Org ${stamp}`);

  await test.step('owner invites the member', async () => {
    await gotoHydrated(page, '/app/organization');
    await page.getByLabel('Invite email').fill(inviteeEmail);
    await page.getByRole('button', { name: 'Invite', exact: true }).click();
    await expect(page.getByText(inviteeEmail)).toBeVisible();
  });

  const inviteId = await test.step('read the invitation id', async () => {
    const response = await page.request.get('/api/auth/organization/list-invitations', {
      headers: { origin },
    });
    expect(response.ok()).toBe(true);
    const invitations = (await response.json()) as Array<{ id: string; email: string }>;
    const invitation = invitations.find((entry) => entry.email === inviteeEmail);
    if (invitation === undefined) {
      throw new Error('Invitation not found');
    }
    return invitation.id;
  });

  await test.step('invitee joins as a member', async () => {
    await signOutButton(page).click();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await gotoHydrated(page, `/invite/${inviteId}`);
    await page.getByRole('link', { name: 'Create an account' }).click();
    await page.getByLabel('Name').fill('Role Member');
    await page.getByLabel('Email').fill(inviteeEmail);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await page.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(page.getByText(`Signed in as ${inviteeEmail}`)).toBeVisible();
  });

  await test.step('members get no webhooks surface', async () => {
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Webhooks' })).toHaveCount(0);

    await gotoHydrated(page, '/app/webhooks');
    await expect(page.getByText("This page doesn't exist.")).toBeVisible();
  });

  await test.step('owner promotes the member to admin', async () => {
    await gotoHydrated(page, '/app');
    await signOutButton(page).click();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await signIn(page, ownerEmail, password);
    await expect(page.getByText(`Signed in as ${ownerEmail}`)).toBeVisible();

    await gotoHydrated(page, '/app/organization');
    await page.getByLabel(`Role for ${inviteeEmail}`).click();
    await page.getByRole('option', { name: 'admin' }).click();
    await expect(page.getByLabel(`Role for ${inviteeEmail}`)).toContainText('admin');
  });

  await test.step('the promoted admin sees webhooks', async () => {
    await signOutButton(page).click();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await signIn(page, inviteeEmail, password);
    await expect(page.getByText(`Signed in as ${inviteeEmail}`)).toBeVisible();

    await expect(page.getByRole('link', { name: 'Webhooks' })).toBeVisible();
    await gotoHydrated(page, '/app/webhooks');
    await expect(page.getByText('Recent deliveries')).toBeVisible();
  });
});
