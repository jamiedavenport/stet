import Sqlite from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { beforeEach, describe, expect, it } from 'vite-plus/test';

import { DAY_MS, HOUR_MS } from './dimensions';
import { getWatermark, hasRawEvents, insertEvents, pruneEvents, runRollup } from './ingest';
import type { IngestEvent } from './ingest';
import { breakdown, timeseries, totals, uniqueVisitors } from './queries';
import { events, rollupState, schemaStatements } from './schema';

// A fixed hour boundary keeps every bucket assertion readable.
const T0 = Date.parse('2026-07-01T00:00:00.000Z');

let db: BetterSQLite3Database;

beforeEach(() => {
  const sqlite = new Sqlite(':memory:');
  for (const statement of schemaStatements) {
    sqlite.exec(statement);
  }
  db = drizzle(sqlite);
});

function pageview(offsetMs: number, overrides: Partial<IngestEvent> = {}): IngestEvent {
  return {
    name: '$pageview',
    timestamp: T0 + offsetMs,
    url: 'https://example.com/',
    props: {},
    context: {},
    ...overrides,
  };
}

function custom(name: string, offsetMs: number): IngestEvent {
  return { name, timestamp: T0 + offsetMs, props: {}, context: {} };
}

async function ingest(incoming: IngestEvent[], now = T0 + 12 * HOUR_MS) {
  return insertEvents(db, incoming, { watermark: await getWatermark(db), now });
}

describe('timeseries', () => {
  it('buckets hourly and fills gaps with zero', async () => {
    await ingest([pageview(0), pageview(10_000), pageview(2 * HOUR_MS)]);
    const points = await timeseries(db, { from: T0, to: T0 + 3 * HOUR_MS, interval: 'hour' });
    expect(points).toEqual([
      { bucket: T0, count: 2 },
      { bucket: T0 + HOUR_MS, count: 0 },
      { bucket: T0 + 2 * HOUR_MS, count: 1 },
    ]);
  });

  it('buckets by day', async () => {
    await ingest([pageview(0), pageview(HOUR_MS), pageview(DAY_MS + HOUR_MS)], T0 + 2 * DAY_MS);
    const points = await timeseries(db, { from: T0, to: T0 + 2 * DAY_MS, interval: 'day' });
    expect(points).toEqual([
      { bucket: T0, count: 2 },
      { bucket: T0 + DAY_MS, count: 1 },
    ]);
  });

  it('follows one event rather than all of them', async () => {
    await ingest([pageview(0), custom('signup', 0), custom('signup', HOUR_MS)]);
    const points = await timeseries(db, {
      from: T0,
      to: T0 + 2 * HOUR_MS,
      interval: 'hour',
      name: 'signup',
    });
    expect(points).toEqual([
      { bucket: T0, count: 1 },
      { bucket: T0 + HOUR_MS, count: 1 },
    ]);
  });

  it('refuses a range no chart could draw', async () => {
    await expect(
      timeseries(db, { from: T0, to: T0 + 2000 * HOUR_MS, interval: 'hour' }),
    ).rejects.toThrow(/exceeds/);
  });
});

describe('breakdowns', () => {
  it('reduces urls to paths and keeps campaign parameters', async () => {
    await ingest([
      pageview(0, { url: 'https://example.com/pricing?utm_source=hn&session=secret-token' }),
      pageview(1, { url: 'https://example.com/pricing?utm_source=hn' }),
      pageview(2, { url: 'https://example.com/docs?utm_source=newsletter' }),
    ]);
    const range = { from: T0, to: T0 + HOUR_MS };

    expect(await breakdown(db, 'path', range)).toEqual([
      { key: '/pricing', count: 2 },
      { key: '/docs', count: 1 },
    ]);
    expect(await breakdown(db, 'source', range)).toEqual([
      { key: 'hn', count: 2 },
      { key: 'newsletter', count: 1 },
    ]);
    const [row] = await db.select().from(events).limit(1);
    expect(JSON.stringify(row)).not.toContain('secret-token');
  });

  it('reduces referrers to their hostname and keeps the odd ones verbatim', async () => {
    await ingest([
      pageview(0, { referrer: 'https://news.ycombinator.com/item?id=1' }),
      pageview(1, { referrer: 'https://news.ycombinator.com/item?id=2' }),
      pageview(2, { referrer: 'newsletter' }),
    ]);
    expect(await breakdown(db, 'referrer', { from: T0, to: T0 + HOUR_MS })).toEqual([
      { key: 'news.ycombinator.com', count: 2 },
      { key: 'newsletter', count: 1 },
    ]);
  });

  it('counts page views only, except for the event breakdown', async () => {
    await ingest([
      pageview(0, { country: 'GB' }),
      { ...custom('signup', 1), country: 'GB' },
      { ...custom('signup', 2), country: 'GB' },
    ]);
    const range = { from: T0, to: T0 + HOUR_MS };

    expect(await breakdown(db, 'country', range)).toEqual([{ key: 'GB', count: 1 }]);
    expect(await breakdown(db, 'event', range)).toEqual([
      { key: 'signup', count: 2 },
      { key: '$pageview', count: 1 },
    ]);
  });

  it('takes the largest values only', async () => {
    await ingest([
      pageview(0, { url: 'https://example.com/a' }),
      pageview(1, { url: 'https://example.com/a' }),
      pageview(2, { url: 'https://example.com/b' }),
      pageview(3, { url: 'https://example.com/c' }),
    ]);
    expect(await breakdown(db, 'path', { from: T0, to: T0 + HOUR_MS, limit: 2 })).toEqual([
      { key: '/a', count: 2 },
      { key: '/b', count: 1 },
    ]);
  });
});

describe('totals', () => {
  it('counts distinct visitors and ignores events with no browser behind them', async () => {
    await ingest([
      pageview(0, { visitor: 'a' }),
      pageview(1, { visitor: 'a' }),
      pageview(2, { visitor: 'b' }),
      pageview(3, { visitor: null }),
      custom('signup', 4),
    ]);
    const range = { from: T0, to: T0 + HOUR_MS };

    expect(await uniqueVisitors(db, range)).toBe(2);
    expect(await totals(db, range)).toEqual({ visitors: 2, pageviews: 4, events: 5 });
  });

  it('bounds visitors by the range', async () => {
    await ingest([
      pageview(0, { visitor: 'a' }),
      pageview(HOUR_MS, { visitor: 'b' }),
      pageview(HOUR_MS + 1, { visitor: 'c' }),
    ]);
    expect(await uniqueVisitors(db, { from: T0 + HOUR_MS, to: T0 + 2 * HOUR_MS })).toBe(2);
  });
});

describe('rollups', () => {
  const seed = [
    pageview(0, { url: 'https://example.com/', referrer: 'https://news.ycombinator.com/' }),
    pageview(10_000, { url: 'https://example.com/pricing' }),
    pageview(HOUR_MS, { url: 'https://example.com/' }),
    custom('signup', HOUR_MS + 5_000),
    pageview(3 * HOUR_MS + 1, { url: 'https://example.com/docs' }),
  ];
  const range = { from: T0, to: T0 + 4 * HOUR_MS };
  const now = T0 + 3 * HOUR_MS + 30 * 60 * 1000;

  async function snapshot() {
    return {
      series: await timeseries(db, { ...range, interval: 'hour' }),
      paths: await breakdown(db, 'path', range),
      referrers: await breakdown(db, 'referrer', range),
      byEvent: await breakdown(db, 'event', range),
    };
  }

  it('reads the same before and after rolling up and pruning', async () => {
    await ingest(seed, now);
    const before = await snapshot();

    expect(await runRollup(db, now)).toBe(T0 + 3 * HOUR_MS);
    await pruneEvents(db, { now, retentionMs: 0 });

    expect(await snapshot()).toEqual(before);
    // The rolled-up raws are gone; the one past the watermark survives.
    expect(await hasRawEvents(db)).toBe(true);
  });

  it('recomputes a window without doubling it', async () => {
    await ingest(seed, now);
    await runRollup(db, now);
    // An alarm that threw after writing rollups but before the watermark
    // advanced runs the same window again over the still-present raws.
    await db.update(rollupState).set({ rolledUpTo: 0 }).where(eq(rollupState.id, 1));
    await runRollup(db, now);

    const byEvent = await breakdown(db, 'event', range);
    expect(byEvent).toEqual([
      { key: '$pageview', count: 4 },
      { key: 'signup', count: 1 },
    ]);
  });

  it('does nothing when there is no closed hour to fold in', async () => {
    await ingest(seed, now);
    const first = await runRollup(db, now);
    expect(await runRollup(db, now)).toBe(first);
  });

  it('keeps a backdated event visible by clamping it to the watermark', async () => {
    await ingest(seed, now);
    await runRollup(db, now);
    const watermark = await getWatermark(db);

    await insertEvents(db, [pageview(-DAY_MS)], { watermark, now });
    const points = await timeseries(db, {
      from: watermark,
      to: watermark + HOUR_MS,
      interval: 'hour',
    });
    // That bucket already held the un-rolled raw; the backdated event lands
    // beside it rather than behind the watermark, where nothing would see it.
    expect(points[0]?.count).toBe(2);
  });
});
