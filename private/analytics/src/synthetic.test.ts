import { describe, expect, it } from 'vite-plus/test';

import { DAY_MS, PAGEVIEW } from './dimensions';
import { generateTraffic } from './synthetic';
import type { SyntheticPage } from './synthetic';

const NOW = Date.parse('2026-07-30T14:20:00.000Z');
const DAYS = 30;

const PAGES: SyntheticPage[] = [
  { path: '/', weight: 30 },
  { path: '/blog', weight: 16 },
  { path: '/blog/hello-world', weight: 34, slug: 'hello-world' },
  { path: '/blog/writing-together', weight: 19, slug: 'writing-together' },
];

function traffic(seed = 1) {
  return generateTraffic({
    pages: PAGES,
    origin: 'https://example.com',
    days: DAYS,
    now: NOW,
    seed,
  });
}

/** Views per UTC day, in the order the days run. */
function perDay(): number[] {
  const days = new Map<number, number>();
  for (const batch of traffic()) {
    for (const event of batch.events) {
      const day = Math.trunc(event.timestamp / DAY_MS);
      days.set(day, (days.get(day) ?? 0) + 1);
    }
  }
  return [...days.entries()].sort(([a], [b]) => a - b).map(([, count]) => count);
}

describe('generateTraffic', () => {
  it('fills every day of the window and none outside it', () => {
    const batches = traffic();
    const stamps = batches.flatMap((batch) => batch.events.map((event) => event.timestamp));
    expect(perDay()).toHaveLength(DAYS);
    expect(Math.min(...stamps)).toBeGreaterThanOrEqual(
      Math.trunc(NOW / DAY_MS) * DAY_MS - (DAYS - 1) * DAY_MS,
    );
    // Events trail their visit by minutes, so the last one may sit just past
    // now; ingest allows five.
    expect(Math.max(...stamps)).toBeLessThan(NOW + 5 * 60 * 1000);
  });

  it('varies day to day rather than drawing a flat line', () => {
    const days = perDay();
    expect(Math.max(...days)).toBeGreaterThan(2 * Math.min(...days));
  });

  it('draws the same month from the same seed', () => {
    expect(traffic()).toEqual(traffic());
    expect(traffic(2)).not.toEqual(traffic());
  });

  it('points every visit at a page that exists, and its events at its entry', () => {
    const paths = new Set(PAGES.map((page) => page.path));
    for (const batch of traffic()) {
      expect(batch.events.length).toBeGreaterThan(0);
      // A batch is one request to the ingest API, which caps at 100 events.
      expect(batch.events.length).toBeLessThanOrEqual(100);
      for (const event of batch.events) {
        const path = new URL(event.url).pathname;
        expect(paths.has(path)).toBe(true);
        if (event.name === 'post.read') {
          expect(path).toBe(`/blog/${String(event.props.slug)}`);
        }
      }
    }
  });

  it('records a pageview for every visit', () => {
    for (const batch of traffic()) {
      expect(batch.events[0].name).toBe(PAGEVIEW);
    }
  });
});
