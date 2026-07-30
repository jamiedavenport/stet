import { seedApiKey } from '@repo/db/seed-data';

import { generateTraffic } from '../src/synthetic';
import type { SyntheticBatch, SyntheticPage } from '../src/synthetic';

// Backfills a month of traffic for the seeded organization, through the same
// public endpoint a customer's mounted handler posts to, so the store rolls
// up and prunes exactly as it would in production. Needs `vp dev` running and
// the database seeded (`pnpm --filter @repo/db seed`).

/** Where examples/tanstack serves each seeded content type. */
const SITE: Record<string, string> = { posts: '/blog', landing: '/' };

const CONCURRENCY = 6;
/** INGEST_RATE_LIMIT allows 1000 requests per 10s per key. Stay well under. */
const REQUESTS_PER_SECOND = 60;
const RETRIES = 4;

function option(name: string, fallback: string): string {
  const flag = process.argv.indexOf(`--${name}`);
  const value = process.argv[flag + 1];
  if (flag !== -1 && value !== undefined) {
    return value;
  }
  return fallback;
}

const origin = option('origin', process.env.STET_ORIGIN ?? 'http://localhost:3000');
const key = option('key', process.env.STET_API_KEY ?? seedApiKey.key);
const site = option('site', 'http://localhost:3001');
const days = Number(option('days', '30'));
const seed = Number(option('seed', '20260701'));

async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${origin}/api/v1${path}`, { headers: { 'x-api-key': key } });
  if (!response.ok) {
    throw new Error(`GET /api/v1${path} answered ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The demo site's pages, drawn from the content actually seeded so the
 * traffic points at entries that exist: a map is one page, a collection is an
 * index plus one page per entry, ranked so the top posts carry the most.
 */
async function discoverPages(): Promise<SyntheticPage[]> {
  const { types } = await api<{ types: { slug: string; kind: 'collection' | 'map' }[] }>('/model');
  if (types.length === 0) {
    throw new Error('No content types. Seed the database first: pnpm --filter @repo/db seed');
  }

  const pages: SyntheticPage[] = [];
  for (const type of types) {
    const prefix = SITE[type.slug] ?? `/${type.slug}`;
    if (type.kind === 'map') {
      pages.push({ path: prefix, weight: 30 });
      continue;
    }
    pages.push({ path: prefix, weight: 16 });
    const { entries } = await api<{ entries: { slug: string }[] }>(`/content/${type.slug}`);
    for (const [rank, entry] of entries.entries()) {
      const weight = Math.round(30 / (rank + 1)) + 4;
      pages.push({ path: `${prefix}/${entry.slug}`, weight, slug: entry.slug });
    }
  }
  return pages;
}

/** One visit, retried while the ingest rate limit is asking us to slow down. */
async function post(batch: SyntheticBatch): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${origin}/api/v1/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(batch),
    });
    if (response.ok) {
      return;
    }
    if (response.status !== 429 || attempt === RETRIES) {
      throw new Error(`POST /api/v1/events answered ${response.status}: ${await response.text()}`);
    }
    await sleep(1000 * 2 ** attempt);
  }
}

async function send(batches: SyntheticBatch[]): Promise<void> {
  const pace = (1000 * CONCURRENCY) / REQUESTS_PER_SECOND;
  let done = 0;
  let reported = 0;
  for (let index = 0; index < batches.length; index += CONCURRENCY) {
    const started = Date.now();
    const wave = batches.slice(index, index + CONCURRENCY);
    await Promise.all(wave.map(post));
    done += wave.length;
    const percent = Math.floor((100 * done) / batches.length);
    if (percent >= reported + 20) {
      reported = percent - (percent % 20);
      console.log(`[analytics] ${reported}%`);
    }
    await sleep(Math.max(0, pace - (Date.now() - started)));
  }
}

const pages = await discoverPages();
const batches = generateTraffic({ pages, origin: site, days, now: Date.now(), seed });
const events = batches.reduce((total, batch) => total + batch.events.length, 0);

console.log(
  `[analytics] ${batches.length} visits, ${events} events over ${days} days ` +
    `across ${pages.length} pages -> ${origin}`,
);
await send(batches);
console.log(
  `[analytics] done. See them at ${origin}/app/analytics. ` +
    'Traffic adds to whatever the store already holds; delete apps/web/.wrangler/state ' +
    'and reseed for a clean month.',
);
