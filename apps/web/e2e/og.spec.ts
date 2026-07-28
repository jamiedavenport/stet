import { expect, test } from '@playwright/test';

// Static assets generated into public/og by og/generate.ts on install and
// build. Snapshots guard the generator pipeline; the small maxDiffPixelRatio
// absorbs anti-aliasing differences across machines.

test('serves the home OG card', async ({ request }) => {
  const response = await request.get('/og/index.png');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  expect(await response.body()).toMatchSnapshot('og-home.png', { maxDiffPixelRatio: 0.02 });
});

test('404s for a page with no generated image', async ({ request }) => {
  const response = await request.get('/og/nonexistent.png');
  expect(response.status()).toBe(404);
});
