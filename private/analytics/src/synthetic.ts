import { DAY_MS, HOUR_MS, PAGEVIEW } from './dimensions';

// Synthetic traffic for a demo workspace: a month of readers browsing the
// blog in examples/tanstack, in the shape that app's analytics route forwards.
// Deterministic, so a reseed redraws the same charts.

/** A page of the demo site and the share of the traffic it draws. */
export type SyntheticPage = {
  path: string;
  weight: number;
  /** Slug of the collection entry the page renders, when it renders one. */
  slug?: string;
};

/** One reader's visit, shaped like a batch from a mounted handler. */
export type SyntheticBatch = {
  context: Record<string, unknown>;
  metadata: {
    visitor: string;
    country: string;
    region: string;
    city: string;
    browser: string;
    os: string;
    device: 'desktop' | 'mobile' | 'tablet';
  };
  events: {
    name: string;
    props: Record<string, unknown>;
    timestamp: number;
    url: string;
    referrer?: string;
  }[];
};

type Device = SyntheticBatch['metadata']['device'];
type Place = Pick<SyntheticBatch['metadata'], 'country' | 'region' | 'city'>;
/** Where a visit came from: a referring site, a campaign, or neither. */
type Source = { referrer?: string; query?: string };
type Weighted<T> = readonly (readonly [T, number])[];

/** Readers on an average weekday at the start of the window. */
const BASE_VISITORS = 34;
/** The day the site reaches the front page, counted back from the last. */
const SPIKE_DAYS_AGO = 10;
const SPIKE_MULTIPLIER = 3.6;
const FINISHED_RATE = 0.35;
const SUBSCRIBE_RATE = 0.04;

const DEVICES: Weighted<Device> = [
  ['desktop', 62],
  ['mobile', 33],
  ['tablet', 5],
];

const PLATFORMS: Record<Device, Weighted<string>> = {
  desktop: [
    ['Windows', 44],
    ['macOS', 42],
    ['Linux', 11],
    ['ChromeOS', 3],
  ],
  mobile: [
    ['iOS', 55],
    ['Android', 45],
  ],
  tablet: [
    ['iOS', 68],
    ['Android', 32],
  ],
};

const BROWSERS: Record<string, Weighted<string>> = {
  Windows: [
    ['Chrome', 58],
    ['Edge', 27],
    ['Firefox', 12],
    ['Opera', 3],
  ],
  macOS: [
    ['Chrome', 42],
    ['Safari', 40],
    ['Firefox', 12],
    ['Edge', 6],
  ],
  Linux: [
    ['Chrome', 50],
    ['Firefox', 45],
    ['Opera', 5],
  ],
  ChromeOS: [['Chrome', 100]],
  iOS: [
    ['Safari', 78],
    ['Chrome', 22],
  ],
  Android: [
    ['Chrome', 76],
    ['Samsung Internet', 18],
    ['Firefox', 6],
  ],
};

const PLACES: Weighted<Place> = [
  [{ country: 'GB', region: 'England', city: 'London' }, 22],
  [{ country: 'US', region: 'California', city: 'San Francisco' }, 14],
  [{ country: 'US', region: 'New York', city: 'New York' }, 12],
  [{ country: 'DE', region: 'Berlin', city: 'Berlin' }, 9],
  [{ country: 'NL', region: 'North Holland', city: 'Amsterdam' }, 7],
  [{ country: 'FR', region: 'Île-de-France', city: 'Paris' }, 6],
  [{ country: 'CA', region: 'Ontario', city: 'Toronto' }, 6],
  [{ country: 'AU', region: 'New South Wales', city: 'Sydney' }, 5],
  [{ country: 'IN', region: 'Karnataka', city: 'Bengaluru' }, 5],
  [{ country: 'ES', region: 'Catalonia', city: 'Barcelona' }, 4],
  [{ country: 'BR', region: 'São Paulo', city: 'São Paulo' }, 4],
  [{ country: 'JP', region: 'Tokyo', city: 'Tokyo' }, 3],
];

const SOURCES: Weighted<Source> = [
  [{}, 32],
  [{ referrer: 'https://www.google.com/' }, 20],
  [{ referrer: 'https://news.ycombinator.com/' }, 7],
  [{ referrer: 'https://x.com/' }, 7],
  [{ referrer: 'https://www.linkedin.com/feed/' }, 6],
  [{ referrer: 'https://www.reddit.com/r/webdev/' }, 5],
  [{ referrer: 'https://github.com/' }, 4],
  [{ referrer: 'https://bsky.app/' }, 4],
  [{ referrer: 'https://duckduckgo.com/' }, 3],
  [{ query: 'utm_source=newsletter&utm_medium=email&utm_campaign=monthly-digest' }, 5],
  [{ query: 'utm_source=x&utm_medium=social&utm_campaign=launch' }, 4],
  [{ query: 'utm_source=google&utm_medium=cpc&utm_campaign=brand' }, 3],
];

/** Pages deep into a visit beyond the one it landed on. */
const DEPTHS: Weighted<number> = [
  [0, 52],
  [1, 29],
  [2, 13],
  [3, 6],
];

const PLACEMENTS: Weighted<string> = [
  ['banner', 62],
  ['footer', 38],
];

/** Share of a day's readers by hour (UTC): quiet overnight, busy afternoons. */
const HOURS: Weighted<number> = [
  3, 2, 1, 1, 1, 2, 4, 9, 15, 23, 28, 30, 28, 27, 31, 32, 30, 26, 21, 17, 14, 10, 7, 5,
].map((weight, hour) => [hour, weight] as const);

/** Mulberry32. A seed is all the state, so the same seed draws the same month. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pick<T>(random: () => number, table: Weighted<T>): T {
  let total = 0;
  for (const [, weight] of table) {
    total += weight;
  }
  let ticket = random() * total;
  for (const [value, weight] of table) {
    ticket -= weight;
    if (ticket <= 0) {
      return value;
    }
  }
  return table[table.length - 1][0];
}

function pickPage(random: () => number, pages: SyntheticPage[]): SyntheticPage {
  return pick(
    random,
    pages.map((page) => [page, page.weight] as const),
  );
}

/** Sixteen bytes of hex, the length of the digest a real handler sends. */
function visitorDigest(random: () => number): string {
  let digest = '';
  for (let index = 0; index < 32; index += 1) {
    digest += Math.trunc(random() * 16).toString(16);
  }
  return digest;
}

function between(random: () => number, low: number, high: number): number {
  return low + Math.trunc(random() * (high - low));
}

/**
 * Readers on one day: a working-week rhythm over a gentle upward trend, plus
 * the one day the site is discovered, so a month of it has a story in it
 * rather than a flat line.
 */
function visitorsOn(
  random: () => number,
  options: { day: number; days: number; weekday: number; spiking: boolean },
): number {
  const trend = 1 + (0.6 * options.day) / options.days;
  const noise = 0.85 + random() * 0.3;
  let readers = BASE_VISITORS * trend * noise;
  if (options.weekday === 0 || options.weekday === 6) {
    readers *= 0.55;
  }
  if (options.spiking) {
    readers *= SPIKE_MULTIPLIER;
  }
  return Math.max(1, Math.round(readers));
}

/**
 * One visit: a landing page, however far the reader went from it, and the
 * events examples/tanstack records along the way (its tracking plan is the
 * one in `examples/tanstack/stet.config.ts`).
 */
function visit(
  random: () => number,
  options: { pages: SyntheticPage[]; origin: string; start: number; landing?: SyntheticPage },
): SyntheticBatch {
  const device = pick(random, DEVICES);
  const os = pick(random, PLATFORMS[device]);
  const source = pick(random, SOURCES);
  const journey = [options.landing ?? pickPage(random, options.pages)];
  for (let step = pick(random, DEPTHS); step > 0; step -= 1) {
    const next = pickPage(random, options.pages);
    if (next !== journey[journey.length - 1]) {
      journey.push(next);
    }
  }

  const events: SyntheticBatch['events'] = [];
  let at = options.start;
  for (const [index, page] of journey.entries()) {
    const landed = index === 0;
    const url = `${options.origin}${page.path}`;
    let campaigned = url;
    if (landed && source.query !== undefined) {
      campaigned = `${url}?${source.query}`;
    }
    events.push({
      name: PAGEVIEW,
      props: {},
      timestamp: at,
      url: campaigned,
      // Only where the reader arrived: later navigations are internal, and
      // counting those would fill the referrer breakdown with this site.
      ...(landed && source.referrer !== undefined ? { referrer: source.referrer } : {}),
    });
    if (page.slug !== undefined) {
      at += between(random, 1_000, 9_000);
      events.push({ name: 'post.read', props: { slug: page.slug }, timestamp: at, url });
      if (random() < FINISHED_RATE) {
        at += between(random, 40_000, 200_000);
        events.push({ name: 'post.finished', props: { slug: page.slug }, timestamp: at, url });
      }
    }
    at += between(random, 15_000, 135_000);
  }

  if (random() < SUBSCRIBE_RATE) {
    const last = journey[journey.length - 1];
    events.push({
      name: 'subscribe',
      props: { placement: pick(random, PLACEMENTS) },
      timestamp: at,
      url: `${options.origin}${last.path}`,
    });
  }

  return {
    context: {},
    metadata: {
      visitor: visitorDigest(random),
      ...pick(random, PLACES),
      browser: pick(random, BROWSERS[os]),
      os,
      device,
    },
    events,
  };
}

/**
 * A window of traffic ending now, one batch per reader per day, oldest first.
 * Visitor digests are day-scoped in the real handler, so a reader who comes
 * back tomorrow is a new one here too.
 */
export function generateTraffic(options: {
  pages: SyntheticPage[];
  /** Origin the demo site is served from. Only the path of it is stored. */
  origin: string;
  days: number;
  now: number;
  seed: number;
}): SyntheticBatch[] {
  const random = prng(options.seed);
  const today = Math.trunc(options.now / DAY_MS) * DAY_MS;
  // The site is found on one post, so the spike lands on the busiest one.
  const discovered = options.pages.filter((page) => page.slug !== undefined);
  const batches: SyntheticBatch[] = [];

  for (let day = 0; day < options.days; day += 1) {
    const dayStart = today - (options.days - 1 - day) * DAY_MS;
    const spiking = day === options.days - SPIKE_DAYS_AGO;
    const weekday = new Date(dayStart).getUTCDay();
    const readers = visitorsOn(random, { day, days: options.days, weekday, spiking });
    for (let reader = 0; reader < readers; reader += 1) {
      const start = dayStart + pick(random, HOURS) * HOUR_MS + between(random, 0, HOUR_MS);
      // The last day is only as far through as the clock is.
      if (start > options.now) {
        continue;
      }
      batches.push(
        visit(random, {
          pages: options.pages,
          origin: options.origin,
          start,
          landing: spiking ? discovered[0] : undefined,
        }),
      );
    }
  }

  return batches.sort((left, right) => left.events[0].timestamp - right.events[0].timestamp);
}
