import { describe, expect, it, vi } from 'vite-plus/test';
import { z } from 'zod';

import { event } from './events';
import { defineAnalytics } from './plan';
import { createAnalyticsHandler } from './server';
import type { IngestBatch } from './wire';

const plan = defineAnalytics({
  events: { signup: event({ plan: z.enum(['free', 'paid']) }) },
});

const CHROME_ON_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://shop.example.com/api/analytics', {
    method: 'POST',
    headers: { 'user-agent': CHROME_ON_MAC, 'cf-connecting-ip': '203.0.113.7', ...headers },
    body: JSON.stringify(body),
  });
}

function batch(name = 'signup', props: Record<string, unknown> = { plan: 'paid' }) {
  return { context: {}, events: [{ name, props, timestamp: 1_700_000_000_000 }] };
}

function harness(options: Parameters<typeof createAnalyticsHandler>[1] = {}) {
  const forwarded: { url: string; init: RequestInit; body: IngestBatch }[] = [];
  const fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    forwarded.push({
      url: String(url),
      init: init ?? {},
      body: JSON.parse(init?.body as string) as IngestBatch,
    });
    return new Response('{"accepted":1}');
  });
  const handler = createAnalyticsHandler(plan, {
    apiKey: 'stet_key',
    origin: 'https://stet.test',
    onError: () => {},
    fetch: fetch as unknown as typeof globalThis.fetch,
    ...options,
  });
  return { handler, forwarded, fetch };
}

describe('analytics handler', () => {
  it('forwards a valid batch with the organization key', async () => {
    const { handler, forwarded } = harness();
    const response = await handler(post(batch()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: 1 });
    expect(forwarded[0]?.url).toBe('https://stet.test/api/v1/events');
    const headers = forwarded[0]?.init.headers as Record<string, string> | undefined;
    expect(headers?.['x-api-key']).toBe('stet_key');
  });

  it('forwards an optional route template', async () => {
    const { handler, forwarded } = harness();
    const event = batch().events[0];
    await handler(post({ context: {}, events: [{ ...event, route: '/checkout/[plan]' }] }));

    expect(forwarded[0]?.body.events[0]?.route).toBe('/checkout/[plan]');
  });

  it.each([
    { route: undefined, accepted: true },
    { route: 'x'.repeat(500), accepted: true },
    { route: '', accepted: false },
    { route: 'x'.repeat(501), accepted: false },
    { route: 42, accepted: false },
  ])('validates route templates: $route', async ({ route, accepted }) => {
    const { handler, fetch } = harness();
    const event = batch().events[0];
    const response = await handler(post({ context: {}, events: [{ ...event, route }] }));

    expect(response.status).toBe(accepted ? 200 : 400);
    expect(fetch).toHaveBeenCalledTimes(accepted ? 1 : 0);
  });

  it('derives metadata the browser never sent', async () => {
    const { handler, forwarded } = harness();
    await handler(post(batch(), { 'cf-ipcountry': 'GB' }));

    const metadata = forwarded[0]?.body.metadata;
    expect(metadata?.country).toBe('GB');
    expect(metadata?.browser).toBe('Chrome');
    expect(metadata?.os).toBe('macOS');
    expect(metadata?.device).toBe('desktop');
    expect(metadata?.visitor).toMatch(/^[0-9a-f]{32}$/);
  });

  it('never forwards the address or user agent it hashed', async () => {
    const { handler, forwarded } = harness();
    await handler(post(batch()));

    const serialized = JSON.stringify(forwarded[0]?.body);
    expect(serialized).not.toContain('203.0.113.7');
    expect(serialized).not.toContain('Macintosh');
  });

  it('lets the server overrule context the browser claimed', async () => {
    const { handler, forwarded } = harness({ context: { userId: 'real' } });
    await handler(post({ ...batch(), context: { userId: 'spoofed', locale: 'en-GB' } }));

    expect(forwarded[0]?.body.context).toEqual({ userId: 'real', locale: 'en-GB' });
  });

  it('keeps browser context when the server has nothing to say', async () => {
    const { handler, forwarded } = harness({ context: () => ({ userId: undefined }) });
    await handler(post({ ...batch(), context: { userId: 'from-browser' } }));

    expect(forwarded[0]?.body.context).toEqual({ userId: 'from-browser' });
  });

  it('rejects an event that is not in the plan', async () => {
    const { handler, fetch } = harness();
    const response = await handler(post(batch('nope', {})));

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects props that do not match the plan', async () => {
    const { handler } = harness();
    const response = await handler(post(batch('signup', { plan: 'enterprise' })));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('plan:') });
  });

  it('accepts and discards automated traffic', async () => {
    const { handler, fetch } = harness();
    const response = await handler(post(batch(), { 'user-agent': 'Googlebot/2.1' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses anything but POST', async () => {
    const { handler } = harness();
    const response = await handler(new Request('https://shop.example.com/api/analytics'));
    expect(response.status).toBe(405);
  });

  it('rejects a malformed body', async () => {
    const { handler } = harness();
    expect((await handler(post({ events: [] }))).status).toBe(400);
    expect((await handler(post({ events: [{ name: '' }] }))).status).toBe(400);
  });

  it('accepts and discards everything while disabled', async () => {
    const { handler, fetch } = harness({ enabled: false });
    const response = await handler(post(batch()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('still checks a batch against the plan while disabled', async () => {
    const { handler } = harness({ enabled: false });
    expect((await handler(post(batch('nope', {})))).status).toBe(400);
  });

  it('stays quiet rather than erroring when no key is configured', async () => {
    const { handler, fetch } = harness({ apiKey: undefined });
    const response = await handler(post(batch()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accepted: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports a missing key once tracking is asked for explicitly', async () => {
    const onError = vi.fn();
    const { handler } = harness({ apiKey: undefined, enabled: true, onError });

    expect((await handler(post(batch()))).status).toBe(500);
    expect(onError).toHaveBeenCalled();
  });

  it('reports a failed forward without throwing', async () => {
    const onError = vi.fn();
    const { handler } = harness({
      onError,
      fetch: (async () => {
        throw new Error('unreachable');
      }) as unknown as typeof globalThis.fetch,
    });

    const response = await handler(post(batch()));
    expect(response.status).toBe(502);
    expect(onError).toHaveBeenCalled();
  });
});
