import { DAY_MS, HOUR_MS } from '@repo/analytics';
import type { Dimension } from '@repo/analytics';
import type { Overview } from '@repo/analytics/store';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

import { declaredEvents } from '#/api/analytics';
import { organizationMiddleware } from '#/session';

/** The windows the dashboard offers, longest last. */
export const ranges = {
  '24h': { label: 'Last 24 hours', durationMs: DAY_MS, interval: 'hour' },
  '7d': { label: 'Last 7 days', durationMs: 7 * DAY_MS, interval: 'day' },
  '30d': { label: 'Last 30 days', durationMs: 30 * DAY_MS, interval: 'day' },
  '90d': { label: 'Last 90 days', durationMs: 90 * DAY_MS, interval: 'day' },
} as const;

export type RangeKey = keyof typeof ranges;

export const rangeKeys = Object.keys(ranges) as RangeKey[];

const rangeSchema = z.enum(rangeKeys as [RangeKey, ...RangeKey[]]);

/**
 * Bucket boundaries for a window. `to` is rounded up to the next bucket so
 * the current, still-filling bucket is included rather than cut off mid-hour.
 */
function boundsOf(range: RangeKey, now: number) {
  const { durationMs, interval } = ranges[range];
  const step = interval === 'hour' ? HOUR_MS : DAY_MS;
  const to = Math.ceil(now / step) * step;
  return { from: to - durationMs, to, interval };
}

/**
 * Everything the dashboard draws, in one round trip to the organization's
 * analytics store. Read through a server function rather than the public API
 * because the dashboard is session-authenticated, like every other /app page.
 */
const getOverview = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator(rangeSchema)
  .handler(async ({ context, data }) => {
    const bounds = boundsOf(data, Date.now());
    const store = env.ANALYTICS.get(env.ANALYTICS.idFromName(context.organizationId));
    // Annotated because Cloudflare's RPC types map a Durable Object's return
    // values through their serializable form, which loses the record's keys.
    const [overview, declared]: [Overview, { name: string }[]] = await Promise.all([
      store.overview(bounds),
      declaredEvents(context.organizationId),
    ]);

    // An event the developers have declared but nobody has fired yet is still
    // part of the plan, so it belongs in the list at zero rather than being
    // absent until it happens.
    const fired = new Set(overview.breakdowns.event.map((row) => row.key));
    const unfired = declared
      .filter((event) => !fired.has(event.name))
      .map((event) => ({ key: event.name, count: 0 }));

    return {
      ...overview,
      ...bounds,
      breakdowns: {
        ...overview.breakdowns,
        event: [...overview.breakdowns.event, ...unfired],
      },
    };
  });

export function analyticsOverviewQuery(range: RangeKey) {
  return queryOptions({
    queryKey: ['analytics', 'overview', range],
    queryFn: () => getOverview({ data: range }),
  });
}

/** The breakdowns the dashboard shows, in the order it shows them. */
export const breakdownPanels = [
  { dimension: 'route', title: 'Top pages', empty: 'No pages yet.' },
  { dimension: 'referrer', title: 'Referrers', empty: 'No referrers yet.' },
  { dimension: 'event', title: 'Events', empty: 'No events yet.' },
  { dimension: 'country', title: 'Countries', empty: 'No countries yet.', icon: 'country' },
  { dimension: 'browser', title: 'Browsers', empty: 'No browsers yet.' },
  { dimension: 'device', title: 'Devices', empty: 'No devices yet.', icon: 'device' },
] satisfies readonly {
  dimension: Dimension;
  title: string;
  empty: string;
  icon?: 'country' | 'device';
}[];
