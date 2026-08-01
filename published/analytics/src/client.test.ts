import { describe, expect, it, vi } from 'vite-plus/test';

import { createAnalytics } from './client';
import type { ClientBatch } from './wire';

// Shaped like a real plan rather than intersected with AnalyticsTypes:
// intersecting would inherit its index signature and let any name through.
type Plan = {
  $types: { events: { signup: { plan: 'free' | 'paid' }; ping: Record<never, never> } };
};

function harness(options: { respond?: () => Promise<Response>; maxBatchSize?: number } = {}) {
  const sent: ClientBatch[] = [];
  const fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    sent.push(JSON.parse(init?.body as string) as ClientBatch);
    return options.respond === undefined ? new Response('{}') : await options.respond();
  });
  const analytics = createAnalytics<Plan>({
    endpoint: '/api/analytics',
    autoPageviews: false,
    maxBatchSize: options.maxBatchSize,
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  return { analytics, sent, fetch };
}

describe('browser client', () => {
  it('batches events into one request', async () => {
    const { analytics, sent, fetch } = harness();
    analytics.track('signup', { plan: 'paid' });
    analytics.track('ping');
    await analytics.flush();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sent[0]?.events.map((event) => event.name)).toEqual(['signup', 'ping']);
    expect(sent[0]?.events[0]?.props).toEqual({ plan: 'paid' });
  });

  it('sends as soon as the batch is full, without waiting for the interval', async () => {
    const { analytics, fetch } = harness({ maxBatchSize: 3 });
    for (let index = 0; index < 3; index += 1) {
      analytics.track('ping');
    }
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });

  it('does nothing when the queue is empty', async () => {
    const { analytics, fetch } = harness();
    await analytics.flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps events for the next flush when the request fails', async () => {
    let attempt = 0;
    const { analytics, sent } = harness({
      respond: async () => {
        attempt += 1;
        if (attempt === 1) {
          throw new Error('offline');
        }
        return new Response('{}');
      },
    });

    analytics.track('ping');
    await analytics.flush();
    await analytics.flush();

    expect(sent).toHaveLength(2);
    expect(sent[1]?.events.map((event) => event.name)).toEqual(['ping']);
  });

  it('never rejects when the endpoint is unreachable', async () => {
    const { analytics } = harness({
      respond: async () => {
        throw new Error('offline');
      },
    });
    analytics.track('ping');
    await expect(analytics.flush()).resolves.toBeUndefined();
  });

  it('sends the context set since the last flush', async () => {
    const { analytics, sent } = harness();
    analytics.setContext({ userId: 'user_1' });
    analytics.track('ping');
    await analytics.flush();
    expect(sent[0]?.context).toEqual({ userId: 'user_1' });
  });

  it('counts a repeated pageview for the same url once', async () => {
    const { analytics, sent } = harness();
    analytics.pageview('https://example.com/pricing');
    analytics.pageview('https://example.com/pricing');
    analytics.pageview('https://example.com/');
    await analytics.flush();

    expect(sent[0]?.events.map((event) => event.url)).toEqual([
      'https://example.com/pricing',
      'https://example.com/',
    ]);
  });

  it('sends a route template without using it for deduplication', async () => {
    const { analytics, sent } = harness();
    analytics.pageview('https://example.com/blog/first', { route: '/blog/[slug]' });
    analytics.pageview('https://example.com/blog/second', { route: '/blog/[slug]' });
    await analytics.flush();

    expect(sent[0]?.events.map((event) => ({ route: event.route, url: event.url }))).toEqual([
      { route: '/blog/[slug]', url: 'https://example.com/blog/first' },
      { route: '/blog/[slug]', url: 'https://example.com/blog/second' },
    ]);
  });

  it('omits invalid route templates so the pathname remains the fallback', async () => {
    const { analytics, sent } = harness();
    analytics.pageview('https://example.com/blog/first', { route: '' });
    analytics.pageview('https://example.com/blog/second', { route: 'x'.repeat(501) });
    await analytics.flush();

    expect(sent[0]?.events.map((event) => event.route)).toEqual([undefined, undefined]);
    expect(sent[0]?.events.map((event) => event.url)).toEqual([
      'https://example.com/blog/first',
      'https://example.com/blog/second',
    ]);
  });

  it('rejects a call that does not match the plan', () => {
    const { analytics } = harness();
    // @ts-expect-error 'plan' is required for signup.
    analytics.track('signup');
    // @ts-expect-error no such event.
    analytics.track('nope');
    expect(true).toBe(true);
  });
});
