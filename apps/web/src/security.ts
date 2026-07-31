import { rateLimitError } from '@repo/api';
import { env } from 'cloudflare:workers';

// Report-only for now: violations surface in the browser console (and any
// reporting endpoint a deployment wires up) without breaking anything. Flipping to
// enforcement means renaming the header and moving the inline hydration
// script to nonces. 'unsafe-inline' scripts and https: images are the two
// deliberate loosenings: TanStack Start hydrates with inline scripts, and
// social-account avatars load from provider CDNs.
const documentCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com",
  'frame-src https://challenges.cloudflare.com',
  "worker-src 'self' blob:",
].join('; ');

/**
 * Adds the security headers to a worker response. Applied to everything the
 * entry serves; the document-only policies (CSP, framing, referrer) attach
 * when the response is HTML. Static assets bypass the worker entirely, so
 * public/_headers repeats nosniff and HSTS for them.
 */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (headers.get('content-type')?.includes('text/html')) {
    headers.set('Content-Security-Policy-Report-Only', documentCsp);
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// The credential endpoints worth throttling. Deliberately excludes
// /device/token (the CLI polls it on an interval Better Auth already
// enforces) and the passkey/social callback endpoints (no secret to guess).
const rateLimitedAuthPaths = new Set([
  '/api/auth/sign-in/email',
  '/api/auth/sign-up/email',
  '/api/auth/request-password-reset',
  '/api/auth/sign-in/magic-link',
  '/api/auth/two-factor/verify-totp',
  '/api/auth/two-factor/verify-backup-code',
]);

/**
 * Throttles credential endpoints per IP and path with the AUTH_RATE_LIMIT
 * binding (a per-colo token bucket). Returns the 429 to serve, or null to
 * let the request through.
 */
export async function enforceAuthRateLimit(request: Request, url: URL): Promise<Response | null> {
  if (request.method !== 'POST' || !rateLimitedAuthPaths.has(url.pathname)) {
    return null;
  }
  // Absent only in local dev, where every request shares the one key.
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  const { success } = await env.AUTH_RATE_LIMIT.limit({ key: `${ip}:${url.pathname}` });
  if (success) {
    return null;
  }
  return tooManyRequests();
}

/** Analytics, which is metered on events rather than on requests. */
function isAnalyticsPath(pathname: string): boolean {
  return (
    pathname === '/api/analytics' ||
    pathname === '/api/v1/events' ||
    pathname.startsWith('/api/v1/events/')
  );
}

/**
 * Throttles the public API per key (falling back to IP for unauthenticated
 * probes). This bounds abuse per colo; the billing quota in @repo/billing
 * remains the durable monthly cap.
 *
 * Analytics gets its own, far larger budget, on both the ingest endpoint and
 * the route this app mounts for its own browser events: one request per
 * browser batch means a busy site makes orders of magnitude more of them than
 * it makes content reads, and `track()` never throws, so throttling it would
 * show up as silently missing data rather than as an error anyone could act on.
 */
export async function enforceApiRateLimit(request: Request): Promise<Response | null> {
  const key =
    request.headers.get('x-api-key') ?? request.headers.get('cf-connecting-ip') ?? 'local';
  const limiter = isAnalyticsPath(new URL(request.url).pathname)
    ? env.INGEST_RATE_LIMIT
    : env.API_RATE_LIMIT;
  const { success } = await limiter.limit({ key });
  if (success) {
    return null;
  }
  return tooManyRequests();
}

// The body is the contract-declared RATE_LIMITED error in oRPC's wire shape,
// so API clients parse this 429 exactly like one thrown inside a procedure.
// The auth endpoints reuse it; their clients only read `message`.
function tooManyRequests(): Response {
  const body = {
    defined: true,
    code: 'RATE_LIMITED',
    status: 429,
    message: rateLimitError.RATE_LIMITED.message,
  };
  return new Response(JSON.stringify(body), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
