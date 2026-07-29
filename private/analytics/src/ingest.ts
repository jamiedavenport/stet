import { and, count, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';
import type { SQLWrapper } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import {
  countsPageviewsOnly,
  DIMENSIONS,
  DIMENSION_NAMES,
  HOUR_MS,
  PAGEVIEW,
  RETENTION_MS,
} from './dimensions';
import { events, rollups, rollupState } from './schema';
import type { NewEventRow } from './schema';

/** Any SQLite drizzle database: the Durable Object's storage, or an in-memory one in tests. */
export type AnalyticsDb = BaseSQLiteDatabase<'sync' | 'async', unknown>;

/** A timestamp may not be further ahead than this, however wrong a clock is. */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

/** Bound parameters per INSERT stay well inside the runtime's ceiling. */
const INSERT_CHUNK = 5;

/** One event as the API hands it over, already reduced to what is stored. */
export type IngestEvent = {
  name: string;
  timestamp: number;
  url?: string;
  referrer?: string;
  visitor?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  props: Record<string, unknown>;
  context: Record<string, unknown>;
};

/**
 * `expr / step * step` with the step inlined as an integer literal: a bound
 * parameter can bind as REAL, which turns SQLite's integer division into
 * float division and misaligns every bucket. Steps are internal constants.
 */
export function bucketExpr(column: SQLWrapper, stepMs: number) {
  const step = sql.raw(String(Math.trunc(stepMs)));
  return sql<number>`(${column} / ${step}) * ${step}`;
}

function hostOf(referrer: string | undefined): string | null {
  if (referrer === undefined || referrer === '') {
    return null;
  }
  try {
    return new URL(referrer).hostname;
  } catch {
    // Referrers are not always URLs: "newsletter" and the like arrive as
    // whatever the caller set, and are worth keeping verbatim.
    return referrer.slice(0, 120);
  }
}

/** Pathname and campaign parameters. The rest of the query string is dropped. */
function urlParts(
  url: string | undefined,
): Pick<NewEventRow, 'path' | 'utmSource' | 'utmMedium' | 'utmCampaign'> {
  if (url === undefined || url === '') {
    return { path: null };
  }
  try {
    const parsed = new URL(url);
    return {
      path: parsed.pathname,
      utmSource: parsed.searchParams.get('utm_source'),
      utmMedium: parsed.searchParams.get('utm_medium'),
      utmCampaign: parsed.searchParams.get('utm_campaign'),
    };
  } catch {
    return { path: null };
  }
}

export async function getWatermark(db: AnalyticsDb): Promise<number> {
  const rows = await db
    .select({ rolledUpTo: rollupState.rolledUpTo })
    .from(rollupState)
    .where(eq(rollupState.id, 1));
  return rows[0]?.rolledUpTo ?? 0;
}

/**
 * Store a batch. Timestamps are clamped into `[watermark, now + slack]`:
 * behind the watermark a row would be invisible to queries and pruned
 * unseen, and ahead of now it would sit in a bucket nobody looks at.
 */
export async function insertEvents(
  db: AnalyticsDb,
  incoming: IngestEvent[],
  options: { watermark: number; now: number },
): Promise<number> {
  const latest = options.now + FUTURE_SLACK_MS;
  const rows: NewEventRow[] = incoming.map((event) => ({
    name: event.name,
    timestamp: Math.min(Math.max(event.timestamp, options.watermark), latest),
    ...urlParts(event.url),
    referrer: hostOf(event.referrer),
    visitor: event.visitor ?? null,
    country: event.country ?? null,
    region: event.region ?? null,
    city: event.city ?? null,
    device: event.device ?? null,
    browser: event.browser ?? null,
    os: event.os ?? null,
    props: JSON.stringify(event.props),
    context: JSON.stringify(event.context),
  }));

  for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
    await db.insert(events).values(rows.slice(index, index + INSERT_CHUNK));
  }
  return rows.length;
}

/**
 * Fold every complete hour since the watermark into `rollups` and advance it.
 * Counts are written with overwrite semantics, so a retry after a crash
 * recomputes the same window instead of doubling it.
 */
export async function runRollup(db: AnalyticsDb, now: number): Promise<number> {
  const watermark = await getWatermark(db);
  // Only closed hours: the current one is still collecting.
  const target = Math.trunc(now / HOUR_MS) * HOUR_MS;
  if (target <= watermark) {
    return watermark;
  }

  const window = and(gte(events.timestamp, watermark), lt(events.timestamp, target));
  for (const dimension of DIMENSION_NAMES) {
    const column = DIMENSIONS[dimension];
    const where = countsPageviewsOnly(dimension)
      ? and(window, eq(events.name, PAGEVIEW), isNotNull(column))
      : and(window, isNotNull(column));

    const grouped = await db
      .select({
        bucket: bucketExpr(events.timestamp, HOUR_MS),
        key: column,
        total: count(),
      })
      .from(events)
      .where(where)
      .groupBy(bucketExpr(events.timestamp, HOUR_MS), column);

    for (const row of grouped) {
      if (row.key === null) {
        continue;
      }
      await db
        .insert(rollups)
        .values({ bucket: row.bucket, dimension, key: row.key, count: row.total })
        .onConflictDoUpdate({
          target: [rollups.bucket, rollups.dimension, rollups.key],
          set: { count: row.total },
        });
    }
  }

  await db
    .insert(rollupState)
    .values({ id: 1, rolledUpTo: target })
    .onConflictDoUpdate({ target: rollupState.id, set: { rolledUpTo: target } });
  return target;
}

/** Drop raw events past the retention window. Their rollups remain. */
export async function pruneEvents(
  db: AnalyticsDb,
  options: { now: number; retentionMs?: number },
): Promise<void> {
  const cutoff = Math.min(
    options.now - (options.retentionMs ?? RETENTION_MS),
    await getWatermark(db),
  );
  await db.delete(events).where(lt(events.timestamp, cutoff));
}

export async function hasRawEvents(db: AnalyticsDb): Promise<boolean> {
  const rows = await db.select({ total: count() }).from(events);
  return (rows[0]?.total ?? 0) > 0;
}
