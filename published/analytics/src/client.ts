/**
 * Browser client. Talks only to the route you mounted in your own app with
 * `createAnalyticsHandler` from `@stetcms/analytics/server` — no keys in the
 * bundle, no third-party origin, nothing for an ad blocker to recognise.
 *
 * ```ts
 * import { createAnalytics } from '@stetcms/analytics/client';
 * import type plan from '../stet.config';
 *
 * export const analytics = createAnalytics<typeof plan>({ endpoint: '/api/analytics' });
 * analytics.track('checkout.completed', { total: 42 });
 * ```
 */

import { PAGEVIEW } from './events';
import type { AnalyticsTypes, TrackArgs } from './types';
import type { ClientBatch, WireEvent } from './wire';

export type { AnalyticsTypes } from './types';

export type AnalyticsOptions = {
  /** Path or URL of the route you mounted the handler on, e.g. `/api/analytics`. */
  endpoint: string;
  /** Props attached to every event in a batch. Your server's values win over these. */
  context?: Record<string, unknown>;
  /** Milliseconds a partial batch waits before being sent. Default 2000. */
  flushInterval?: number;
  /** Send as soon as this many events are queued. Default 20. */
  maxBatchSize?: number;
  /** Record a pageview on load and on history navigation. Default true. */
  autoPageviews?: boolean;
  /** Override fetch, e.g. in tests. */
  fetch?: typeof globalThis.fetch;
};

export type Analytics<TPlan extends AnalyticsTypes> = {
  /** Record an event from the tracking plan. Never throws and never rejects. */
  track: <K extends keyof TPlan['$types']['events'] & string>(
    name: K,
    ...args: TrackArgs<TPlan['$types']['events'][K]>
  ) => void;
  /** Record a pageview. Called for you unless `autoPageviews` is off. */
  pageview: (url?: string) => void;
  /** Merge props into the context sent with every later batch. */
  setContext: (context: Record<string, unknown>) => void;
  /** Send anything queued now. Resolves once the request settles. */
  flush: () => Promise<void>;
};

export function createAnalytics<TPlan extends AnalyticsTypes>(
  options: AnalyticsOptions,
): Analytics<TPlan> {
  const isBrowser = typeof window !== 'undefined';
  const flushInterval = options.flushInterval ?? 2000;
  const maxBatchSize = options.maxBatchSize ?? 20;
  const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);

  let context = { ...options.context };
  let queue: WireEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastPageviewUrl: string | undefined;

  async function flush(): Promise<void> {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (queue.length === 0) {
      return;
    }
    const events = queue;
    queue = [];
    const batch: ClientBatch = { context, events };
    try {
      await fetcher(options.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(batch),
        // Lets the request outlive the page it was sent from.
        keepalive: true,
      });
    } catch {
      // Put them back so the next flush retries; a page that never gets one
      // drops them, which is the right trade for analytics.
      queue = [...events, ...queue];
    }
  }

  function enqueue(event: WireEvent): void {
    queue.push(event);
    if (queue.length >= maxBatchSize) {
      void flush();
      return;
    }
    timer ??= setTimeout(() => void flush(), flushInterval);
  }

  function envelope(): Pick<WireEvent, 'url' | 'referrer'> {
    if (!isBrowser) {
      return {};
    }
    return {
      url: window.location.href,
      ...(document.referrer === '' ? {} : { referrer: document.referrer }),
    };
  }

  function track(name: string, props?: Record<string, unknown>): void {
    enqueue({ name, props: props ?? {}, timestamp: Date.now(), ...envelope() });
  }

  function pageview(url?: string): void {
    const envelopeUrl = url ?? (isBrowser ? window.location.href : undefined);
    // Routers commonly push the same URL twice on a redirect or a re-render;
    // counting that as two views would overstate every such page.
    if (envelopeUrl !== undefined && envelopeUrl === lastPageviewUrl) {
      return;
    }
    lastPageviewUrl = envelopeUrl;
    enqueue({
      name: PAGEVIEW,
      props: {},
      timestamp: Date.now(),
      ...envelope(),
      ...(envelopeUrl === undefined ? {} : { url: envelopeUrl }),
    });
  }

  if (isBrowser) {
    window.addEventListener('pagehide', () => void flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    });

    if (options.autoPageviews ?? true) {
      pageview();
      const pushState = window.history.pushState.bind(window.history);
      window.history.pushState = (...args) => {
        pushState(...args);
        pageview();
      };
      window.addEventListener('popstate', () => pageview());
    }
  }

  return {
    track,
    pageview,
    setContext: (next) => {
      context = { ...context, ...next };
    },
    flush,
  };
}
