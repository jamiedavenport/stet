import { and, count, countDistinct, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';

import { countsPageviewsOnly, DAY_MS, DIMENSIONS, HOUR_MS, PAGEVIEW } from './dimensions';
import type { Dimension } from './dimensions';
import { bucketExpr, getWatermark } from './ingest';
import type { AnalyticsDb } from './ingest';
import { events, rollups } from './schema';

/** Refuse a range that would return more buckets than a chart can show. */
const MAX_BUCKETS = 1000;

export type Interval = 'hour' | 'day';
export type Range = { from: number; to: number };
export type TimeseriesPoint = { bucket: number; count: number };
export type BreakdownRow = { key: string; count: number };
export type Totals = { visitors: number; pageviews: number; events: number };

function stepOf(interval: Interval): number {
  return interval === 'hour' ? HOUR_MS : DAY_MS;
}

function add(
  totals: Map<string | number, number>,
  key: string | number | null,
  value: number,
): void {
  if (key === null) {
    return;
  }
  totals.set(key, (totals.get(key) ?? 0) + value);
}

/**
 * Counts per bucket for one event name, spanning both stores: hours before
 * the watermark come from the rollups, everything after from the raws that
 * have not been folded in yet. Gaps are filled with zero so a chart's x-axis
 * stays continuous.
 */
export async function timeseries(
  db: AnalyticsDb,
  query: Range & { interval: Interval; name?: string },
): Promise<TimeseriesPoint[]> {
  const step = stepOf(query.interval);
  const first = Math.trunc(query.from / step) * step;
  if ((query.to - first) / step > MAX_BUCKETS) {
    return Promise.reject(new Error(`range exceeds ${MAX_BUCKETS} ${query.interval} buckets`));
  }

  const name = query.name ?? PAGEVIEW;
  const watermark = await getWatermark(db);
  const totals = new Map<string | number, number>();

  if (query.from < watermark) {
    const rolled = await db
      .select({
        bucket: bucketExpr(rollups.bucket, step),
        total: sql<number>`sum(${rollups.count})`,
      })
      .from(rollups)
      .where(
        and(
          eq(rollups.dimension, 'event'),
          eq(rollups.key, name),
          gte(rollups.bucket, query.from),
          lt(rollups.bucket, Math.min(query.to, watermark)),
        ),
      )
      .groupBy(bucketExpr(rollups.bucket, step));
    for (const row of rolled) {
      add(totals, row.bucket, Number(row.total));
    }
  }

  const raw = await db
    .select({ bucket: bucketExpr(events.timestamp, step), total: count() })
    .from(events)
    .where(
      and(
        eq(events.name, name),
        gte(events.timestamp, Math.max(query.from, watermark)),
        lt(events.timestamp, query.to),
      ),
    )
    .groupBy(bucketExpr(events.timestamp, step));
  for (const row of raw) {
    add(totals, row.bucket, row.total);
  }

  const points: TimeseriesPoint[] = [];
  for (let bucket = first; bucket < query.to; bucket += step) {
    points.push({ bucket, count: totals.get(bucket) ?? 0 });
  }
  return points;
}

/** Distinct visitor digests per bucket, read from retained raw events. */
export async function visitorTimeseries(
  db: AnalyticsDb,
  query: Range & { interval: Interval },
): Promise<TimeseriesPoint[]> {
  const step = stepOf(query.interval);
  const first = Math.trunc(query.from / step) * step;
  if ((query.to - first) / step > MAX_BUCKETS) {
    return Promise.reject(new Error(`range exceeds ${MAX_BUCKETS} ${query.interval} buckets`));
  }

  const rows = await db
    .select({
      bucket: bucketExpr(events.timestamp, step),
      total: countDistinct(events.visitor),
    })
    .from(events)
    .where(
      and(
        gte(events.timestamp, query.from),
        lt(events.timestamp, query.to),
        isNotNull(events.visitor),
      ),
    )
    .groupBy(bucketExpr(events.timestamp, step));
  const totals = new Map(rows.map((row) => [row.bucket, row.total]));

  const points: TimeseriesPoint[] = [];
  for (let bucket = first; bucket < query.to; bucket += step) {
    points.push({ bucket, count: totals.get(bucket) ?? 0 });
  }
  return points;
}

/** The top values of one dimension over a range, largest first. */
export async function breakdown(
  db: AnalyticsDb,
  dimension: Dimension,
  query: Range & { limit?: number },
): Promise<BreakdownRow[]> {
  const limit = query.limit ?? 10;
  const watermark = await getWatermark(db);
  const column = DIMENSIONS[dimension];
  const totals = new Map<string | number, number>();

  if (query.from < watermark) {
    const rolled = await db
      .select({ key: rollups.key, total: sql<number>`sum(${rollups.count})` })
      .from(rollups)
      .where(
        and(
          eq(rollups.dimension, dimension),
          gte(rollups.bucket, query.from),
          lt(rollups.bucket, Math.min(query.to, watermark)),
        ),
      )
      .groupBy(rollups.key);
    for (const row of rolled) {
      add(totals, row.key, Number(row.total));
    }
  }

  const window = and(
    gte(events.timestamp, Math.max(query.from, watermark)),
    lt(events.timestamp, query.to),
    isNotNull(column),
  );
  const raw = await db
    .select({ key: column, total: count() })
    .from(events)
    .where(countsPageviewsOnly(dimension) ? and(window, eq(events.name, PAGEVIEW)) : window)
    .groupBy(column);
  for (const row of raw) {
    add(totals, row.key, row.total);
  }

  return [...totals.entries()]
    .map(([key, value]) => ({ key: String(key), count: value }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/**
 * Distinct visitors over a range. Digests are day-scoped by design, so this
 * counts a reader once per day they visited rather than once per range, and
 * it reads raws only: a count of distinct things cannot be summed from
 * per-hour totals, so it is exact within the retention window and zero
 * before it.
 */
export async function uniqueVisitors(db: AnalyticsDb, range: Range): Promise<number> {
  const rows = await db
    .select({ total: countDistinct(events.visitor) })
    .from(events)
    .where(
      and(
        gte(events.timestamp, range.from),
        lt(events.timestamp, range.to),
        isNotNull(events.visitor),
      ),
    );
  return rows[0]?.total ?? 0;
}

export async function totals(db: AnalyticsDb, range: Range): Promise<Totals> {
  const byEvent = await breakdown(db, 'event', { ...range, limit: Number.MAX_SAFE_INTEGER });
  let all = 0;
  for (const row of byEvent) {
    all += row.count;
  }
  return {
    visitors: await uniqueVisitors(db, range),
    pageviews: byEvent.find((row) => row.key === PAGEVIEW)?.count ?? 0,
    events: all,
  };
}
