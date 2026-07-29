/**
 * The route you mount in your own app. Events go browser → your backend →
 * Stet, so there is no third-party origin in the page, nothing for a blocker
 * to match on, and every reader's address stays inside infrastructure you
 * control.
 *
 * ```ts
 * import { createAnalyticsHandler } from '@stetcms/analytics/server';
 * import plan from '../stet.config';
 *
 * const handler = createAnalyticsHandler(plan, {
 *   context: async (request) => ({ userId: (await session(request))?.userId }),
 * });
 * export const POST = handler;
 * ```
 */

import { resolveStetConfig } from '@stetcms/config';

import { deriveMetadata, isBot } from './metadata';
import { formatIssues, validateEvent } from './plan';
import type { AnalyticsPlan } from './plan';
import type { EventsShape } from './types';
import { parseClientBatch } from './wire';
import type { IngestBatch, WireEvent } from './wire';

export type AnalyticsHandlerOptions = {
  /**
   * Props merged into every batch. Yours win over anything the browser sent,
   * because the browser is the untrusted side. A function is called per
   * request, which is how request-scoped values like a session reach here.
   */
  context?:
    | Record<string, unknown>
    | ((request: Request) => Record<string, unknown> | Promise<Record<string, unknown>>);
  /** Stet deployment. Defaults to the plan's, then `STET_ORIGIN`, then the cloud. */
  origin?: string;
  /** Organization API key. Defaults to the plan's, then `STET_API_KEY`. */
  apiKey?: string;
  /**
   * Salt mixed into the visitor digest. Defaults to the request's host, which
   * keeps visitor ids from being comparable across sites you run.
   */
  salt?: string;
  /** Called when a batch cannot be forwarded. Defaults to console.error. */
  onError?: (error: unknown) => void;
  /** Override fetch, e.g. in tests. */
  fetch?: typeof globalThis.fetch;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function createAnalyticsHandler<TEvents extends EventsShape>(
  plan: AnalyticsPlan<TEvents>,
  options: AnalyticsHandlerOptions = {},
): (request: Request) => Promise<Response> {
  const onError = options.onError ?? ((error: unknown) => console.error('[stet analytics]', error));

  return async (request) => {
    if (request.method !== 'POST') {
      return json({ error: 'method not allowed' }, 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid JSON body' }, 400);
    }

    const parsed = parseClientBatch(body);
    if (!parsed.ok) {
      return json({ error: parsed.error }, 400);
    }

    // Automation is answered normally and thrown away: a 4xx would only teach
    // a crawler to retry, and counting it would flatter every number here.
    if (isBot(request.headers.get('user-agent') ?? '')) {
      return json({ accepted: 0 });
    }

    const events: WireEvent[] = [];
    for (const event of parsed.value.events) {
      const validated = await validateEvent(plan.events, event.name, event.props);
      if (!validated.ok) {
        return json({ error: `event "${event.name}": ${formatIssues(validated.issues)}` }, 400);
      }
      events.push({ ...event, props: validated.props });
    }

    const context: Record<string, unknown> = { ...parsed.value.context };
    const server =
      typeof options.context === 'function' ? await options.context(request) : options.context;
    for (const [key, value] of Object.entries(server ?? {})) {
      // A missing session must read as "unknown", not as a deletion of what
      // the browser told us.
      if (value !== undefined) {
        context[key] = value;
      }
    }

    const salt = options.salt ?? new URL(request.url).host;
    const batch: IngestBatch = {
      context,
      metadata: await deriveMetadata(request, salt),
      events,
    };

    // The same ladder the plugin and the CLI settle on, so a project cannot
    // send events somewhere its codegen never looked.
    const { origin, apiKey } = resolveStetConfig(
      { origin: plan.origin, apiKey: plan.apiKey },
      { origin: options.origin, apiKey: options.apiKey },
    );
    if (apiKey === undefined) {
      onError(new Error('No API key. Set STET_API_KEY or pass apiKey.'));
      return json({ error: 'analytics is not configured' }, 500);
    }

    try {
      const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
      const response = await fetcher(`${origin}/api/v1/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        throw new Error(`Stet responded ${response.status}`);
      }
      return json({ accepted: events.length });
    } catch (error) {
      onError(error);
      return json({ error: 'failed to forward events' }, 502);
    }
  };
}
