import { expect, test } from '@playwright/test';

// Guards the navigation performance behavior: sidebar navigations must stay
// client-side (no full document loads), and after the first client-side
// navigation fills the session cache, later navigations must not call the
// getSessionContext server function again.
test('client-side navigations do not refetch the session context', async ({ page }) => {
  await page.goto('/app');
  await page.waitForLoadState('networkidle');
  // Hydration must finish before clicking; SSR anchors are inert until then
  // and clicks would fall through to native full-page navigation.
  await page.waitForFunction(() => {
    const anchor = document.querySelector('a[href="/app/settings"]');
    if (anchor === null) {
      return false;
    }
    return Object.keys(anchor).some((key) => key.startsWith('__reactProps'));
  });

  const sessionFetches: string[] = [];
  const documentLoads: string[] = [];
  page.on('request', (request) => {
    if (request.isNavigationRequest()) {
      documentLoads.push(request.url());
      return;
    }
    const [, serverFnId] = request.url().split('/_serverFn/');
    if (serverFnId !== undefined) {
      const decoded = Buffer.from(decodeURIComponent(serverFnId), 'base64').toString('utf8');
      if (decoded.includes('session.ts')) {
        sessionFetches.push(decoded);
      }
    }
  });

  // First visits compile these routes on demand in the dev server, which can
  // outlast the default expect timeout on a cold run.
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByText('Your profile')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('link', { name: 'Organization' }).click();
  await expect(page.getByText('People with access to')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('link', { name: 'Webhooks' }).click();
  await expect(page.getByText('Recent deliveries')).toBeVisible();
  await page.getByRole('link', { name: 'Home' }).click();
  await expect(page.getByText('Signed in as')).toBeVisible();

  expect(documentLoads).toHaveLength(0);
  // SSR dehydrates the session-context query into the HTML, so the client
  // cache starts warm and no navigation should ever refetch it.
  expect(sessionFetches).toHaveLength(0);

  // The Better Auth cookie cache must be active so getSession skips D1.
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name.includes('session_data'))).toBe(true);
});
