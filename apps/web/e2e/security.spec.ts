import { expect, test } from '@playwright/test';

const origin = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

// Header assertions only: values are contractual (security posture), unlike
// page copy.
test('documents carry the security headers', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);

  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
  expect(headers['content-security-policy-report-only']).toContain("default-src 'self'");
});

test('non-document API responses stay unadorned but nosniffed', async ({ request }) => {
  const response = await request.get('/api/v1/health');
  expect(response.status()).toBe(200);

  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy-report-only']).toBeUndefined();
});

// The always-pass Turnstile test keys ship in .dev.vars.example, which CI
// copies verbatim, so the plugin is on for every run.
test('credential endpoints require a captcha token', async ({ request }) => {
  const response = await request.post('/api/auth/sign-in/email', {
    data: { email: 'captcha-check@example.com', password: 'irrelevant-password' },
    headers: { origin },
  });

  // Distinct from a bad password, which reaches the handler and 401s.
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ code: 'MISSING_RESPONSE' });
});

test('credential endpoints throttle a burst from one address', async ({ request }) => {
  // The limiter keys on cf-connecting-ip, which Cloudflare overwrites in
  // production but nothing sets locally: sending a unique one gives this test
  // its own token bucket instead of draining the budget every other spec's
  // sign-in shares.
  const headers = { origin, 'cf-connecting-ip': '203.0.113.7' };
  const data = { email: 'rate-limit@example.com', password: 'irrelevant-password' };

  const statuses: number[] = [];
  for (let attempt = 0; attempt < 31; attempt += 1) {
    const response = await request.post('/api/auth/sign-in/email', { data, headers });
    statuses.push(response.status());
  }

  const throttled = statuses.indexOf(429);
  expect(throttled).toBeGreaterThan(0);
  // Everything before the limit trips is the captcha rejection above, so the
  // 429 is the limiter and not a Better Auth response.
  expect(statuses.slice(0, throttled).every((status) => status === 400)).toBe(true);

  const last = await request.post('/api/auth/sign-in/email', { data, headers });
  expect(last.status()).toBe(429);
  expect(last.headers()['retry-after']).toBe('60');
  expect(last.headers()['x-content-type-options']).toBe('nosniff');
});
