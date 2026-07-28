import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';
import { Webhook } from 'standardwebhooks';

import { gotoHydrated } from './helpers';

test('webhook endpoints require an API key on the public API', async ({ request }) => {
  const response = await request.get('/api/v1/webhooks');
  expect(response.status()).toBe(401);
});

// The whole pipeline: settings page -> server function -> queue ->
// deliver-webhook job -> signed POST to a live receiver -> delivery ledger,
// with the signature verified by the standardwebhooks library exactly as a
// buyer's customer would.
test('an endpoint receives a signed, verifiable test delivery', async ({ page }) => {
  const received: { headers: Record<string, string>; body: string }[] = [];
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body = body + chunk.toString();
    });
    request.on('end', () => {
      received.push({ headers: request.headers as Record<string, string>, body });
      response.writeHead(200);
      response.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/hooks`;

  try {
    await gotoHydrated(page, '/app/webhooks');
    await page.getByLabel('Endpoint URL').fill(url);
    await page.getByRole('button', { name: 'ping', exact: true }).click();
    await page.getByRole('button', { name: 'Create endpoint' }).click();

    const row = page.locator('li').filter({ hasText: url });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: 'Reveal secret' }).click();
    const secret = await row.getByText(/^whsec_/).innerText();

    await row.getByRole('button', { name: 'Send test' }).click();
    await expect(row.getByText('Test event queued.')).toBeVisible();

    await expect.poll(() => received.length, { timeout: 10_000 }).toBeGreaterThan(0);
    const delivery = received[0];
    expect(delivery.headers['webhook-id']).toBeTruthy();
    const payload = new Webhook(secret).verify(delivery.body, delivery.headers) as {
      type: string;
    };
    expect(payload.type).toBe('ping');

    // The ledger row lands moments after the receiver responds; reload until
    // the deliveries card shows it.
    await expect
      .poll(
        async () => {
          await gotoHydrated(page, '/app/webhooks');
          return page.getByText('Delivered').first().isVisible();
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    // Clean up so re-runs against the same local database stay tidy.
    await page
      .locator('li')
      .filter({ hasText: url })
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect(page.locator('li').filter({ hasText: url })).toHaveCount(0);
  } finally {
    server.close();
  }
});

// A delivery that failed (receiver down) is re-queued from the ledger once
// the receiver is back. Background queue retries may race the button against
// a recovered receiver; the assertions that matter are that the redeliver
// action queues without error and the ledger row ends up Delivered.
test('a failed delivery can be redelivered once the receiver recovers', async ({ page }) => {
  // Bind and release a port so the first delivery attempt hits nothing.
  const probe = http.createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()));
  });
  const url = `http://127.0.0.1:${port}/hooks`;

  await gotoHydrated(page, '/app/webhooks');
  await page.getByLabel('Endpoint URL').fill(url);
  await page.getByRole('button', { name: 'ping', exact: true }).click();
  await page.getByRole('button', { name: 'Create endpoint' }).click();
  const row = page.locator('li').filter({ hasText: url });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Send test' }).click();

  await expect
    .poll(
      async () => {
        await gotoHydrated(page, '/app/webhooks');
        return page.getByText('Failed').first().isVisible();
      },
      { timeout: 20_000 },
    )
    .toBe(true);

  const received: string[] = [];
  const server = http.createServer((request, response) => {
    received.push(request.url ?? '');
    response.writeHead(200);
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));

  try {
    await page.getByRole('button', { name: 'Redeliver' }).first().click();
    await expect(page.getByText('Redelivery queued.')).toBeVisible();
    await expect.poll(() => received.length, { timeout: 10_000 }).toBeGreaterThan(0);
    await expect
      .poll(
        async () => {
          await gotoHydrated(page, '/app/webhooks');
          return page.getByText('Delivered').first().isVisible();
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    await page
      .locator('li')
      .filter({ hasText: url })
      .getByRole('button', { name: 'Delete' })
      .click();
    await expect(page.locator('li').filter({ hasText: url })).toHaveCount(0);
  } finally {
    server.close();
  }
});
