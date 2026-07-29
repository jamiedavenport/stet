export { DEFAULT_ORIGIN } from '@stetcms/config';

/** Events per batch. Anything larger is a client bug or an abusive caller. */
export const MAX_BATCH_EVENTS = 100;

const MAX_NAME_LENGTH = 120;

/** One event as it travels from the browser to the route you mounted. */
export type WireEvent = {
  name: string;
  props: Record<string, unknown>;
  /** Epoch milliseconds, stamped in the browser when the event happened. */
  timestamp: number;
  url?: string;
  referrer?: string;
};

/** The body the browser client POSTs to your route. */
export type ClientBatch = {
  context: Record<string, unknown>;
  events: WireEvent[];
};

/**
 * What the handler derives from the browser's request. Every field is
 * optional: a proxy may strip the headers it comes from, and analytics never
 * fails a request over missing context.
 */
export type EventMetadata = {
  /** Day-scoped visitor digest. Never a raw address, never stable past midnight. */
  visitor?: string;
  country?: string;
  region?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
};

/** The body the handler forwards to Stet, once it has enriched the batch. */
export type IngestBatch = {
  context: Record<string, unknown>;
  metadata: EventMetadata;
  events: WireEvent[];
};

export type ParseResult = { ok: true; value: ClientBatch } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEvent(
  value: unknown,
  index: number,
): { ok: true; value: WireEvent } | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: `events[${index}] is not an object` };
  }
  const { name, props, timestamp, url, referrer } = value;
  if (typeof name !== 'string' || name === '' || name.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `events[${index}].name must be a name of 1 to ${MAX_NAME_LENGTH} characters`,
    };
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0) {
    return { ok: false, error: `events[${index}].timestamp must be epoch milliseconds` };
  }
  if (props !== undefined && !isRecord(props)) {
    return { ok: false, error: `events[${index}].props must be an object` };
  }
  if (url !== undefined && typeof url !== 'string') {
    return { ok: false, error: `events[${index}].url must be a string` };
  }
  if (referrer !== undefined && typeof referrer !== 'string') {
    return { ok: false, error: `events[${index}].referrer must be a string` };
  }
  return {
    ok: true,
    value: {
      name,
      props: isRecord(props) ? props : {},
      timestamp,
      ...(typeof url === 'string' ? { url } : {}),
      ...(typeof referrer === 'string' ? { referrer } : {}),
    },
  };
}

/**
 * Validates a batch posted by a browser. The body is untrusted input from the
 * open internet, so this checks shape by hand rather than trusting a cast;
 * props are validated against the tracking plan separately.
 */
export function parseClientBatch(body: unknown): ParseResult {
  if (!isRecord(body)) {
    return { ok: false, error: 'body must be an object' };
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return { ok: false, error: 'events must be a non-empty array' };
  }
  if (body.events.length > MAX_BATCH_EVENTS) {
    return { ok: false, error: `events must hold at most ${MAX_BATCH_EVENTS} entries` };
  }
  if (body.context !== undefined && !isRecord(body.context)) {
    return { ok: false, error: 'context must be an object' };
  }

  const events: WireEvent[] = [];
  for (const [index, raw] of body.events.entries()) {
    const parsed = parseEvent(raw, index);
    if (!parsed.ok) {
      return parsed;
    }
    events.push(parsed.value);
  }

  return { ok: true, value: { context: isRecord(body.context) ? body.context : {}, events } };
}
