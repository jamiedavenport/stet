import type { EventMetadata } from './wire';

/** Cloudflare attaches geo to the request itself rather than to a header. */
type CfProperties = {
  country?: string;
  region?: string;
  city?: string;
};

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview|monitor|curl|wget|python-requests|axios|node-fetch/i;

/** Whether the caller announces itself as automation rather than a reader. */
export function isBot(userAgent: string): boolean {
  return BOT_PATTERN.test(userAgent);
}

function browserOf(userAgent: string, brands: string): string | undefined {
  // Client-hint brands are the honest answer where Chromium sends them; the
  // UA string has spoofed its way through thirty years of compatibility hacks.
  for (const brand of ['Microsoft Edge', 'Opera', 'Samsung Internet', 'Google Chrome', 'Firefox']) {
    if (brands.includes(brand)) {
      return brand === 'Google Chrome' ? 'Chrome' : brand === 'Microsoft Edge' ? 'Edge' : brand;
    }
  }
  if (/Edg[A-Z]?\//.test(userAgent)) return 'Edge';
  if (/OPR\/|Opera/.test(userAgent)) return 'Opera';
  if (/SamsungBrowser\//.test(userAgent)) return 'Samsung Internet';
  if (/Firefox\/|FxiOS\//.test(userAgent)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(userAgent)) return 'Chrome';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return undefined;
}

function osOf(userAgent: string, platform: string): string | undefined {
  const hint = platform.replaceAll('"', '').trim();
  if (hint !== '') {
    return hint === 'macOS' || hint === 'iOS' ? hint : hint === 'Chrome OS' ? 'ChromeOS' : hint;
  }
  // Android before Linux: every Android UA also claims Linux.
  if (/Android/.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  if (/Windows NT/.test(userAgent)) return 'Windows';
  if (/Mac OS X/.test(userAgent)) return 'macOS';
  if (/CrOS/.test(userAgent)) return 'ChromeOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  return undefined;
}

function deviceOf(userAgent: string, mobileHint: string): EventMetadata['device'] {
  if (/iPad|Tablet|PlayBook|Silk/.test(userAgent) || /Android(?!.*Mobile)/.test(userAgent)) {
    return 'tablet';
  }
  if (mobileHint.includes('?1') || /Mobi|iPhone|iPod|Android/.test(userAgent)) {
    return 'mobile';
  }
  if (userAgent === '') {
    return undefined;
  }
  return 'desktop';
}

function clientAddress(headers: Headers): string {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    ''
  );
}

function decode(value: string | null): string | undefined {
  if (value === null || value === '') {
    return undefined;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Geo as the edge already knows it. Nothing is looked up, so nothing is billed. */
function geoOf(request: Request): Pick<EventMetadata, 'country' | 'region' | 'city'> {
  const cf = (request as Request & { cf?: CfProperties }).cf;
  const headers = request.headers;
  return {
    country:
      cf?.country ?? decode(headers.get('cf-ipcountry') ?? headers.get('x-vercel-ip-country')),
    region: cf?.region ?? decode(headers.get('x-vercel-ip-country-region')),
    city: cf?.city ?? decode(headers.get('x-vercel-ip-city')),
  };
}

/**
 * A visitor id that cannot outlive the day it was made: the digest covers the
 * date, so the same reader tomorrow is a different id, and the inputs (IP and
 * user agent) are never stored or forwarded anywhere. No cookie, nothing to
 * consent to, and nothing to join across days even by whoever holds the data.
 */
async function visitorDigest(request: Request, salt: string): Promise<string | undefined> {
  const address = clientAddress(request.headers);
  const userAgent = request.headers.get('user-agent') ?? '';
  if (address === '' && userAgent === '') {
    return undefined;
  }
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${day}:${salt}:${address}:${userAgent}`),
  );
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Everything Stet learns about a reader, derived here in your own backend so
 * the raw address and user agent never leave it.
 */
export async function deriveMetadata(request: Request, salt: string): Promise<EventMetadata> {
  const headers = request.headers;
  const userAgent = headers.get('user-agent') ?? '';
  const metadata: EventMetadata = {
    visitor: await visitorDigest(request, salt),
    ...geoOf(request),
    browser: browserOf(userAgent, headers.get('sec-ch-ua') ?? ''),
    os: osOf(userAgent, headers.get('sec-ch-ua-platform') ?? ''),
    device: deviceOf(userAgent, headers.get('sec-ch-ua-mobile') ?? ''),
  };
  // Undefined keys would serialize as absent anyway; dropping them keeps the
  // forwarded body small and the stored rows honest about what was known.
  for (const key of Object.keys(metadata) as (keyof EventMetadata)[]) {
    if (metadata[key] === undefined) {
      delete metadata[key];
    }
  }
  return metadata;
}
