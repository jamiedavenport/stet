import { expect, test } from '@playwright/test';

// Public marketing pages: no seeded database or session required. These are
// deliberately thin -- they check that the routes render and that the
// machine-readable surface responds, never the copy or the number of posts,
// both of which change as the pitch and the blog evolve.

test('landing page renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation').first()).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('blog index renders', async ({ page }) => {
  await page.goto('/blog');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('landing page embeds Organization JSON-LD', async ({ page }) => {
  await page.goto('/');

  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(raw ?? '')['@type']).toBe('Organization');
});

test('feeds and machine-readable routes respond', async ({ request }) => {
  const rss = await request.get('/rss.xml');
  expect(rss.status()).toBe(200);
  expect(await rss.text()).toContain('<rss');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('<urlset');

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap:');

  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  expect(await llms.text()).toMatch(/^#\s/);
});

test('signed-out visitors to /app are sent to sign-in', async ({ page }) => {
  await page.goto('/app');

  await expect(page).toHaveURL(/\/sign\/in\?redirect=/);
});
