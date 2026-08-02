import { readFile } from 'node:fs/promises';

import { seedInvitation, seedOrganization, seedUser } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated, signIn, signOut } from './helpers';

// Signed out: these flows are about arriving without a session.
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

test('creates an organization from a model kit without content', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const email = `delivered+kit-${Date.now()}@resend.dev`;
  const organizationName = `Kit Org ${Date.now()}`;
  const kit = {
    format: 'stet-model-kit',
    version: 1,
    name: 'Agency website',
    types: [
      {
        name: 'Authors',
        slug: 'authors',
        kind: 'collection',
        fields: [{ name: 'Name', key: 'display_name', type: 'text' }],
      },
      {
        name: 'Posts',
        slug: 'posts',
        kind: 'collection',
        fields: [
          {
            name: 'Status',
            key: 'status',
            type: 'select',
            options: [{ name: 'Draft', color: 'gray' }],
          },
          { name: 'Author', key: 'author', type: 'reference', collection: 'authors' },
        ],
      },
    ],
  };

  await gotoHydrated(page, '/sign/up');
  await page.getByLabel('Name').fill('Kit Test');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-strong-password');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Create an organization')).toBeVisible();
  await page.getByLabel('Name').fill(organizationName);
  await page.getByLabel('Model kit (optional)').setInputFiles({
    name: 'agency.stet-kit.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(kit)),
  });
  await expect(page.getByText('2 collections, 0 maps, and 3 fields.')).toBeVisible();
  await page.getByRole('button', { name: 'Create organization' }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole('link', { name: 'Authors' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Posts' })).toBeVisible();

  // Round-trip through export to prove import created full definitions, not
  // just the types: the Status options and the Author reference survive.
  await gotoHydrated(page, '/app/organization');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export model kit' }).click();
  const download = await pending;
  const path = await download.path();
  expect(path).not.toBeNull();
  const exported = JSON.parse(await readFile(path ?? '', 'utf8')) as {
    types: Array<{ slug: string; fields: unknown[] }>;
  };
  const posts = exported.types.find((type) => type.slug === 'posts');
  expect(posts?.fields).toEqual([
    expect.objectContaining({
      name: 'Status',
      key: 'status',
      type: 'select',
      options: [{ name: 'Draft', color: 'gray' }],
    }),
    expect.objectContaining({
      name: 'Author',
      key: 'author',
      type: 'reference',
      collection: 'authors',
    }),
  ]);
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
