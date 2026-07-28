import fs from 'node:fs';
import path from 'node:path';

import { seedUser } from '@repo/db/seed-data';
import { createUnsubscribeToken } from '@repo/mail/unsubscribe';
import { expect, test } from '@playwright/test';

import { gotoHydrated } from './helpers';

// Tokens are minted with the same secret the dev server signs with, read
// from .dev.vars, so the suite exercises real verification.
function devSecret(): string {
  const devVars = fs.readFileSync(path.join(import.meta.dirname, '../.dev.vars'), 'utf8');
  const match = /^BETTER_AUTH_SECRET=(.+)$/m.exec(devVars);
  if (match === null) {
    throw new Error('BETTER_AUTH_SECRET missing from apps/web/.dev.vars');
  }
  return match[1].trim();
}

const emailToggle = { name: /email notifications/i };

// All three tests mutate the seed user's one settings row, so they must not
// interleave under fullyParallel.
test.describe.configure({ mode: 'serial' });

test('one-click unsubscribe flips the master email switch off', async ({ page }) => {
  const token = await createUnsubscribeToken(devSecret(), {
    kind: 'notification-emails',
    id: seedUser.id,
  });

  // The RFC 8058 path: mail clients POST with this exact body and no
  // cookies.
  const response = await page.request.post(`/mail/unsubscribe?token=${token}`, {
    form: { 'List-Unsubscribe': 'One-Click' },
  });
  expect(response.status()).toBe(200);

  await gotoHydrated(page, '/app/settings');
  const toggle = page.getByRole('checkbox', emailToggle);
  await expect(toggle).not.toBeChecked();

  // Turning it back on restores the seed user for the rest of the suite and
  // covers the settings half of the switch.
  await toggle.click();
  await expect(toggle).toBeChecked();
});

test('the emailed link confirms before applying', async ({ page }) => {
  const token = await createUnsubscribeToken(devSecret(), {
    kind: 'notification-emails',
    id: seedUser.id,
  });

  await gotoHydrated(page, `/mail/unsubscribe?token=${token}`);
  await expect(page.getByText('Unsubscribe from emails')).toBeVisible();

  await page.getByRole('button', { name: 'Unsubscribe' }).click();
  await expect(page.getByText("You're unsubscribed")).toBeVisible();

  await gotoHydrated(page, '/app/settings');
  const toggle = page.getByRole('checkbox', emailToggle);
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(toggle).toBeChecked();
});

test('invalid tokens do not unsubscribe anyone', async ({ page }) => {
  const denied = await page.request.post('/mail/unsubscribe?token=garbage', {
    form: { 'List-Unsubscribe': 'One-Click' },
  });
  expect(denied.status()).toBe(400);

  await gotoHydrated(page, '/mail/unsubscribe?token=garbage');
  await expect(page.getByText('This unsubscribe link is invalid.')).toBeVisible();

  await gotoHydrated(page, '/mail/unsubscribe');
  await expect(page.getByText('This unsubscribe link is invalid.')).toBeVisible();
});
