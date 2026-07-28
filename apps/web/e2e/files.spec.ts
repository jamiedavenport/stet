import path from 'node:path';

import { expect, request as apiRequest, test, type Page } from '@playwright/test';

import { freshStorageState, gotoHydrated, signUpWithOrg } from './helpers';

const fixture = path.join(import.meta.dirname, 'fixtures/avatar.png');

// On an account of its own: uploading replaces the uploader's avatar, and
// spec files run in parallel, so sharing the seed user with settings.spec
// would have the two deleting each other's asset mid-run.
test.describe.configure({ mode: 'serial' });

let page: Page;
/** The canonical asset URL, without transform parameters. */
let assetPath: string;

// browser.newContext() does not inherit the project's `use` options, so the
// base URL is passed to every context created here.
test.beforeAll(async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: freshStorageState() });
  page = await context.newPage();

  const stamp = Date.now();
  await signUpWithOrg(
    page,
    'Files User',
    `delivered+files-${stamp}@resend.dev`,
    `Files Org ${stamp}`,
  );

  await gotoHydrated(page, '/app/settings');
  await page.getByLabel('Choose profile photo').setInputFiles(fixture);
  // Remove appears once the account carries an image, so the tests below
  // measure serving rather than upload latency.
  await expect(page.getByRole('button', { name: 'Remove' })).toBeVisible();

  const image = page.locator('img[src*="/api/files/"]').first();
  await expect(image).toBeVisible();
  const src = await image.getAttribute('src');
  if (src === null) {
    throw new Error('Avatar image has no src');
  }
  assetPath = src.split('?')[0];
});

test.afterAll(async () => {
  await page.context().close();
});

test('serves a stored asset, and a transformed variant of it', async () => {
  const original = await page.request.get(assetPath);
  expect(original.status()).toBe(200);
  expect(original.headers()['content-type']).toBe('image/png');
  expect(original.headers()['content-disposition']).toBe('inline');
  expect(original.headers()['x-content-type-options']).toBe('nosniff');

  const resized = await page.request.get(`${assetPath}?w=32&format=webp`);
  expect(resized.status()).toBe(200);
  expect(resized.headers()['content-type']).toBe('image/webp');

  const ignored = await page.request.get(`${assetPath}?w=notanumber&fit=sideways`);
  expect(ignored.status()).toBe(200);
  expect(ignored.headers()['content-type']).toBe('image/png');
});

test('refuses an asset to anonymous callers and to unknown ids', async ({ baseURL }) => {
  // The empty storage state is required, not incidental: without it the
  // context picks up the project's saved sign-in and this asserts the
  // cross-tenant rule again instead of the anonymous one.
  const anonymous = await apiRequest.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  });
  const denied = await anonymous.get(assetPath);
  expect(denied.status()).toBe(401);
  await anonymous.dispose();

  // Signed in, but nothing behind the id: not found rather than unauthorized.
  const missing = await page.request.get('/api/files/00000000-0000-4000-8000-000000000000');
  expect(missing.status()).toBe(404);
});

test('will not let a second upload overwrite a stored asset', async () => {
  // Only a pending row accepts bytes, so an asset already holding its own
  // cannot be rewritten, by its owner or anyone else.
  const overwrite = await page.request.put(assetPath, {
    data: 'not an image',
    headers: { 'content-type': 'image/png' },
  });
  expect(overwrite.status()).toBe(404);

  const unchanged = await page.request.get(assetPath);
  expect(unchanged.headers()['content-type']).toBe('image/png');
  expect((await unchanged.body()).subarray(1, 4).toString()).toBe('PNG');
});

test('keeps a personal asset from people who share no organization', async ({
  browser,
  baseURL,
}) => {
  const stranger = await browser.newContext({ baseURL, storageState: freshStorageState() });
  const strangerPage = await stranger.newPage();
  const stamp = Date.now();
  await signUpWithOrg(
    strangerPage,
    'Files Stranger',
    `delivered+stranger-${stamp}@resend.dev`,
    `Stranger Org ${stamp}`,
  );

  const denied = await strangerPage.request.get(assetPath);
  expect(denied.status()).toBe(404);
  await stranger.close();
});
