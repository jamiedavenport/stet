import { seedApiKey } from '@repo/db/seed-data';
import { expect, test } from '@playwright/test';

import { gotoHydrated } from './helpers';

// One pass over the whole feature: an event enters through the public API the
// way a customer's mounted handler sends it, and comes back out on the
// dashboard the way an editor reads it.

const keyHeader = { 'x-api-key': seedApiKey.key };

/** The stat tiles, which are totals rather than a ranked list. */
async function views(page: import('@playwright/test').Page): Promise<number> {
  const text = await page.getByTestId('stat-pageviews').textContent();
  return Number((text ?? '0').replaceAll(/[^0-9]/g, ''));
}

test('records events through the API and charts them on the dashboard', async ({
  page,
  request,
}) => {
  // First visit to the dashboard compiles the route and its chart library on
  // demand, which is well past the default timeout on a cold dev server.
  test.setTimeout(120_000);

  // Asserted as a delta against the totals rather than by looking for a path
  // in "Top pages": that list is capped at ten rows, so on any store holding
  // real traffic a freshly added path would rank below the fold.
  await gotoHydrated(page, '/app/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics', level: 1 })).toBeVisible();
  await expect(page.getByTestId('stat-pageviews')).not.toHaveText('—');
  const before = await views(page);

  const now = Date.now();
  const ingest = await request.post('/api/v1/events', {
    headers: keyHeader,
    data: {
      context: {},
      metadata: { visitor: 'e2e-visitor', country: 'GB', browser: 'Chrome', device: 'desktop' },
      events: [
        {
          name: '$pageview',
          props: {},
          timestamp: now,
          url: `https://example.com/e2e-analytics?utm_source=e2e&token=secret`,
          referrer: 'https://news.ycombinator.com/item?id=1',
        },
        {
          name: '$pageview',
          props: {},
          timestamp: now + 10,
          url: 'https://example.com/e2e-analytics',
        },
      ],
    },
  });
  expect(ingest.status()).toBe(200);
  expect(await ingest.json()).toEqual({ accepted: 2 });

  await gotoHydrated(page, '/app/analytics');
  await expect(page.getByTestId('stat-pageviews')).not.toHaveText('—');
  expect(await views(page)).toBe(before + 2);
});

test('rejects events without an organization key', async ({ request }) => {
  const response = await request.post('/api/v1/events', {
    data: { events: [{ name: '$pageview', props: {}, timestamp: Date.now() }] },
  });
  expect(response.status()).toBe(401);
});

// Stet's own analytics run the same path a customer's do, through a route
// mounted in this app (see dogfooding/analytics). The count is not asserted:
// CI runs with STET_API_KEY blank, so batches are accepted and dropped rather
// than forwarded, which is also what keeps this suite's own browsing out of
// the totals the test above measures. What matters here is that the route is
// mounted, takes a well-formed batch, and never fails the page that sent it.
test('accepts a browser batch on the mounted analytics route', async ({ request }) => {
  const response = await request.post('/api/analytics', {
    data: {
      context: {},
      events: [{ name: '$pageview', props: {}, timestamp: Date.now(), url: '/e2e-mounted' }],
    },
  });

  expect(response.status()).toBe(200);
  expect(await response.json()).toHaveProperty('accepted');
});

test('publishes a tracking plan and replaces it on the next sync', async ({ request }) => {
  const first = await request.put('/api/v1/events/schema', {
    headers: keyHeader,
    data: {
      events: [
        { name: 'e2e.one', props: ['slug'] },
        { name: 'e2e.two', props: [] },
      ],
    },
  });
  expect(first.status()).toBe(200);
  expect(await first.json()).toEqual({ synced: 2 });

  // Replacement, not merge: dropping an event from the plan drops it here.
  const second = await request.put('/api/v1/events/schema', {
    headers: keyHeader,
    data: { events: [{ name: 'e2e.one', props: ['slug'] }] },
  });
  expect(await second.json()).toEqual({ synced: 1 });
});
