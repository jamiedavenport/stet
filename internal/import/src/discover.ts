import { fetchText } from './page';

// Inventories a site before anything expensive happens: sitemap.xml when the
// site has one, links harvested from the entry page otherwise. The wizard's
// scope step runs on this, so it has to be cheap and need no credentials.

const urlCap = 300;
const childSitemapCap = 5;

export type DiscoveredGroup = {
  id: string;
  /** Human-readable label, e.g. `/blog/*` or `Top-level pages`. */
  pattern: string;
  urls: string[];
  /** The section's index page, e.g. /blog for /blog/*: a listing, not an entry. */
  hubUrl?: string;
};

export type Discovery = {
  origin: string;
  groups: DiscoveredGroup[];
  /** True when the site listed more pages than the cap kept. */
  truncated: boolean;
};

export async function discoverSite(input: string): Promise<Discovery> {
  const start = normalizeUrl(input);
  const origin = start.origin;

  let urls = await sitemapUrls(origin);
  if (urls.length === 0) {
    urls = await linkedUrls(start);
  }
  if (urls.length === 0) {
    throw new Error('No pages found: the site has no sitemap and the page has no same-site links');
  }

  const truncated = urls.length > urlCap;
  return { origin, groups: groupUrls(origin, urls.slice(0, urlCap)), truncated };
}

function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol);
}

async function sitemapUrls(origin: string): Promise<string[]> {
  const xml = await fetchText(`${origin}/sitemap.xml`);
  if (xml === null) {
    return [];
  }
  const locs = parseLocs(xml);
  // A sitemap index lists further sitemaps rather than pages.
  const children = locs.filter((loc) => loc.endsWith('.xml'));
  if (children.length === 0) {
    return keepPages(origin, locs);
  }
  const pages: string[] = [];
  for (const child of children.slice(0, childSitemapCap)) {
    const childXml = await fetchText(child);
    if (childXml !== null) {
      pages.push(...parseLocs(childXml));
    }
    if (pages.length > urlCap * 2) {
      break;
    }
  }
  return keepPages(origin, pages);
}

function parseLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]);
}

async function linkedUrls(start: URL): Promise<string[]> {
  const html = await fetchText(start.href);
  if (html === null) {
    throw new Error(`Could not fetch ${start.href}`);
  }
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map((match) => match[1]);
  const resolved: string[] = [start.href];
  for (const href of hrefs) {
    try {
      resolved.push(new URL(href, start).href);
    } catch {
      // Not a URL (mailto:, javascript:, malformed); skip it.
    }
  }
  return keepPages(start.origin, resolved);
}

const skippedExtensions =
  /\.(png|jpe?g|gif|webp|svg|ico|css|js|json|xml|txt|pdf|zip|mp4|webm|mp3|woff2?)$/i;

/** Same-origin page URLs, normalized (no query or hash) and deduplicated. */
function keepPages(origin: string, urls: string[]): string[] {
  const pages = new Set<string>();
  for (const raw of urls) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.origin !== origin || skippedExtensions.test(url.pathname)) {
      continue;
    }
    const path = url.pathname.replace(/\/+$/, '');
    pages.add(`${origin}${path === '' ? '/' : path}`);
  }
  return [...pages];
}

/**
 * Groups URLs by their first path segment, so /blog/one and /blog/two land
 * together for the model proposal. A section keeps its group at any size: a
 * blog with one post is still a collection, not a one-off. The section's own
 * index page rides along as hubUrl so the proposal knows it is a listing.
 * Pages at the root form the "Top-level pages" group: the map candidates.
 */
export function groupUrls(origin: string, urls: string[]): DiscoveredGroup[] {
  const sections = new Map<string, string[]>();
  const topLevel: string[] = [];
  for (const url of urls) {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    if (segments.length < 2) {
      topLevel.push(url);
    } else {
      const existing = sections.get(segments[0]) ?? [];
      existing.push(url);
      sections.set(segments[0], existing);
    }
  }

  const groups: DiscoveredGroup[] = [];
  const hubs = new Set<string>();
  for (const [segment, sectionUrls] of sections) {
    const hubUrl = topLevel.find((url) => new URL(url).pathname === `/${segment}`);
    if (hubUrl !== undefined) {
      hubs.add(hubUrl);
    }
    groups.push({
      id: `section-${segment}`,
      pattern: `/${segment}/*`,
      urls: sectionUrls.sort(),
      hubUrl,
    });
  }
  groups.sort((a, b) => b.urls.length - a.urls.length);
  const rest = topLevel.filter((url) => !hubs.has(url)).sort();
  if (rest.length > 0) {
    groups.push({ id: 'top-level', pattern: 'Top-level pages', urls: rest });
  }
  return groups;
}
