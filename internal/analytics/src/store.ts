import { DurableObject } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/durable-sqlite';
import type { DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite';

import { DIMENSION_NAMES, HOUR_MS } from './dimensions';
import type { Dimension } from './dimensions';
import { getWatermark, hasRawEvents, insertEvents, pruneEvents, runRollup } from './ingest';
import type { IngestEvent } from './ingest';
import { breakdown, timeseries, totals, visitorTimeseries } from './queries';
import type { BreakdownRow, Interval, Range, TimeseriesPoint, Totals } from './queries';
import { schemaMigrations } from './schema';

/** How often a store holding raw events rolls up and prunes. */
const ROLLUP_INTERVAL_MS = HOUR_MS;

/**
 * The store keeps everything in its own storage, so it needs nothing from the
 * worker environment but the DSN the Sentry wrapper reads: a Durable Object
 * runs outside the fetch handler and initializes the SDK per instance.
 * The real Env (apps/web) satisfies this structurally.
 */
export type AnalyticsEnv = {
  SENTRY_DSN: string;
};

export type OverviewQuery = Range & { interval: Interval; limit?: number };

export type Overview = {
  totals: Totals;
  /** Traffic counts grouped into UTC-aligned hour or day buckets. */
  timeseries: {
    /** Epoch milliseconds at the start of the bucket. */
    bucket: number;
    /** Page views recorded within the bucket. */
    views: number;
    /** Distinct day-scoped visitor digests seen within the bucket. */
    visitors: number;
  }[];
  breakdowns: Record<Dimension, BreakdownRow[]>;
};

/**
 * One instance per organization, addressed by `idFromName(organizationId)`.
 * Owns that organization's analytics in its embedded SQLite database: raw
 * events, hourly rollups, and retention.
 *
 * Keeping it out of D1 is deliberate. Event traffic is append-heavy and
 * unbounded, and D1 holds the content everything else in Stet reads on every
 * request; one organization's launch day should not slow down anyone's editor.
 */
export class AnalyticsStore extends DurableObject<AnalyticsEnv> {
  private db: DrizzleSqliteDODatabase;
  private watermark = 0;

  constructor(ctx: DurableObjectState, env: AnalyticsEnv) {
    super(ctx, env);
    this.db = drizzle(ctx.storage);
    // A constructor cannot await; blockConcurrencyWhile holds back every
    // request, including the one that woke this instance, until it settles.
    void ctx.blockConcurrencyWhile(async () => {
      migrate(ctx.storage);
      this.watermark = await getWatermark(this.db);
    });
  }

  async ingest(incoming: IngestEvent[]): Promise<number> {
    const accepted = await insertEvents(this.db, incoming, {
      watermark: this.watermark,
      now: Date.now(),
    });
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + ROLLUP_INTERVAL_MS);
    }
    return accepted;
  }

  /** Everything the dashboard draws, in one round trip to this object. */
  async overview(query: OverviewQuery): Promise<Overview> {
    const limit = query.limit ?? 10;
    const breakdowns = {} as Record<Dimension, BreakdownRow[]>;
    for (const dimension of DIMENSION_NAMES) {
      breakdowns[dimension] = await breakdown(this.db, dimension, { ...query, limit });
    }
    const [summary, views, visitors] = await Promise.all([
      totals(this.db, query),
      timeseries(this.db, query),
      visitorTimeseries(this.db, query),
    ]);
    return {
      totals: summary,
      timeseries: views.map((point, index) => ({
        bucket: point.bucket,
        views: point.count,
        visitors: visitors[index]?.count ?? 0,
      })),
      breakdowns,
    };
  }

  async series(query: Range & { interval: Interval; name?: string }): Promise<TimeseriesPoint[]> {
    return timeseries(this.db, query);
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    this.watermark = await runRollup(this.db, now);
    await pruneEvents(this.db, { now });
    if (await hasRawEvents(this.db)) {
      await this.ctx.storage.setAlarm(now + ROLLUP_INTERVAL_MS);
    }
  }
}

function migrate(storage: DurableObjectStorage): void {
  storage.sql.exec(`CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
    id INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const applied = new Set(
    [...storage.sql.exec<{ id: number }>('SELECT id FROM _sql_schema_migrations')].map(
      (row) => row.id,
    ),
  );

  for (const migration of schemaMigrations) {
    if (applied.has(migration.id)) {
      continue;
    }
    storage.transactionSync(() => {
      for (const statement of migration.statements) {
        storage.sql.exec(statement);
      }
      storage.sql.exec('INSERT INTO _sql_schema_migrations (id) VALUES (?)', migration.id);
    });
  }
}
