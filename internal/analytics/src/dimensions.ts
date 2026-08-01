import { events } from './schema';

/** The event name every browser client sends for a page view. */
export const PAGEVIEW = '$pageview';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** How long raw events survive once they have been rolled up. */
export const RETENTION_MS = 90 * DAY_MS;

/**
 * Every breakdown the dashboard can ask for, and the column it counts. One
 * mapping drives ingest, rollup and query, so adding a breakdown is a line
 * here plus a column on the events table.
 */
export const DIMENSIONS = {
  event: events.name,
  path: events.path,
  route: events.route,
  referrer: events.referrer,
  country: events.country,
  region: events.region,
  city: events.city,
  device: events.device,
  browser: events.browser,
  os: events.os,
  source: events.utmSource,
  campaign: events.utmCampaign,
} as const;

export type Dimension = keyof typeof DIMENSIONS;

export const DIMENSION_NAMES = Object.keys(DIMENSIONS) as Dimension[];

/**
 * `event` counts every event; the rest describe where a reader came from and
 * what they read, so they count page views only. Mixing custom events into
 * "top pages" would make the number mean nothing in particular.
 */
export function countsPageviewsOnly(dimension: Dimension): boolean {
  return dimension !== 'event';
}
