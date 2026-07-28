import { brand } from '@repo/brand';
import { expect, test } from '@playwright/test';

import { freshStorageState, gotoHydrated } from './helpers';

const localeCookie = `${brand.slug}-locale`;

// Each test signs up its own account: locale is stored on the user, and
// flipping the shared seeded user's language would race the other specs
// (fullyParallel workers assert English copy).
test.use({ storageState: freshStorageState() });

test('switching language persists on the account and across the cookie', async ({
  page,
  context,
}) => {
  const email = `delivered+i18n-${Date.now()}@resend.dev`;

  await gotoHydrated(page, '/sign/up');
  await page.getByLabel('Name').fill('Locale Test');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a-strong-password');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Create an organization')).toBeVisible();
  await page.getByLabel('Name').fill(`Org ${Date.now()}`);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await gotoHydrated(page, '/app/settings');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // Selecting a language saves it to the account, pins the cookie, and
  // reloads into the new locale.
  await page.getByLabel('Language').click();
  await page.getByRole('option', { name: 'Español' }).click();

  // "Idioma" is the Language card title, unique on the page (the settings
  // nav item and page title both say "Configuración").
  await expect(page.getByText('Idioma')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === localeCookie)?.value).toBe('es');

  // Survives a reload.
  await page.reload();
  await expect(page.getByText('Idioma')).toBeVisible();

  // Survives losing the cookie: the stored preference wins and the server
  // pins the cookie again (the "new device" path).
  await context.clearCookies({ name: localeCookie });
  await page.reload();
  await expect(page.getByText('Idioma')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const restored = await context.cookies();
  expect(restored.find((cookie) => cookie.name === localeCookie)?.value).toBe('es');
});

test('anonymous visitors are served their browser language', async ({ browser }) => {
  const context = await browser.newContext({
    locale: 'fr-FR',
    extraHTTPHeaders: { 'accept-language': 'fr-FR,fr;q=0.9' },
  });
  const page = await context.newPage();

  await gotoHydrated(page, '/sign/in');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByText('Bon retour parmi nous')).toBeVisible();

  await context.close();
});

test('the marketing footer switches language for anonymous visitors', async ({ page, context }) => {
  await gotoHydrated(page, '/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  // The footer select writes the cookie and reloads into the new locale.
  // Asserted through `lang` and the cookie, not copy, so the pitch can
  // change without touching this test.
  await page.getByLabel('Language').selectOption('es');

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === localeCookie)?.value).toBe('es');

  // The choice follows the visitor to another marketing page.
  await gotoHydrated(page, '/contact');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
