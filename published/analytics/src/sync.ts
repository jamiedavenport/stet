/**
 * Publishing the tracking plan to Stet.
 *
 * Free of relative imports on purpose, like `@stetcms/client/codegen`: build
 * tools load this entry under plain Node, which resolves package names but
 * not this package's own extensionless paths. That is why the flatten walk is
 * repeated here rather than imported from `./events`.
 */

import { DEFAULT_ORIGIN } from '@stetcms/config';

import type { EventsShape } from './types';

export type SyncOptions = {
  events: EventsShape;
  /** Organization API key. Server-side only. */
  apiKey: string;
  origin?: string;
  fetch?: typeof globalThis.fetch;
};

function flatten(events: EventsShape, prefix = ''): { name: string; props: string[] }[] {
  const flat: { name: string; props: string[] }[] = [];
  for (const [key, value] of Object.entries(events)) {
    const name = prefix === '' ? key : `${prefix}.${key}`;
    if ((value as { $event?: unknown }).$event === true) {
      flat.push({ name, props: Object.keys((value as { props: object }).props) });
    } else {
      flat.push(...flatten(value as EventsShape, name));
    }
  }
  return flat;
}

/**
 * Publishes the tracking plan, so the events your code declares can be picked
 * from the dashboard before anyone has fired one. Run by `@stetcms/vite` on
 * dev-server start and at the end of a build, and by `stet sync`.
 *
 * Replacement, not merge: an event deleted from your code disappears from the
 * list on the next sync, while anything already recorded under that name
 * keeps its history.
 */
export async function syncTrackingPlan(options: SyncOptions): Promise<{ synced: number }> {
  const origin = options.origin ?? DEFAULT_ORIGIN;
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);

  const response = await fetcher(`${origin}/api/v1/events/schema`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-api-key': options.apiKey },
    body: JSON.stringify({ events: flatten(options.events) }),
  });
  if (!response.ok) {
    throw new Error(`PUT ${origin}/api/v1/events/schema responded ${response.status}`);
  }
  return (await response.json()) as { synced: number };
}
