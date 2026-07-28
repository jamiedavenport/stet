import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated, signOutButton, signUpWithOrg } from './helpers';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Fresh users and orgs: these specs destroy what they create and must never
// touch the shared seed organization.
test.use({ storageState: freshStorageState() });

test('an owner can permanently delete their organization', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();

  await signUpWithOrg(
    page,
    'Delete Owner',
    `delivered+org-delete-${stamp}@resend.dev`,
    `Doomed Org ${stamp}`,
  );

  await gotoHydrated(page, '/app/organization');
  await page.getByRole('button', { name: 'Delete organization' }).click();
  await page.getByRole('button', { name: 'Yes, delete' }).click();

  // The only organization is gone, so the app bounces to create a new one.
  await expect(page.getByText('Create an organization')).toBeVisible();
});

test('an invited member can leave the organization', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const inviteeEmail = `delivered+org-leave-${stamp}@resend.dev`;

  await signUpWithOrg(
    page,
    'Leave Owner',
    `delivered+org-owner-${stamp}@resend.dev`,
    `Sticky Org ${stamp}`,
  );

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

  await test.step('invitee signs up through the invite link and accepts', async () => {
    await signOutButton(page).click();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await gotoHydrated(page, `/invite/${inviteId}`);
    await page.getByRole('link', { name: 'Create an account' }).click();
    await page.getByLabel('Name').fill('Invited Leaver');
    await page.getByLabel('Email').fill(inviteeEmail);
    await page.getByLabel('Password').fill('a-strong-password');
    await page.getByRole('button', { name: 'Create account' }).click();

    await page.getByRole('button', { name: 'Accept invitation' }).click();
    await expect(page.getByText(`Signed in as ${inviteeEmail}`)).toBeVisible();
  });

  await test.step('the member leaves from the danger zone', async () => {
    await gotoHydrated(page, '/app/organization');
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await page.getByRole('button', { name: 'Yes, leave' }).click();

    // The invitee belonged to only this organization, so leaving bounces to
    // the create-org page.
    await expect(page.getByText('Create an organization')).toBeVisible();
  });
});
