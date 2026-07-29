import { describe, expect, it } from 'vite-plus/test';

import { deriveMetadata, isBot } from './metadata';

function request(headers: Record<string, string>, cf?: Record<string, string>): Request {
  const base = new Request('https://shop.example.com/api/analytics', { headers });
  return cf === undefined ? base : Object.assign(base, { cf });
}

const AGENTS = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  firefoxWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
  chromeAndroidTablet:
    'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

describe('user agent', () => {
  it('reads browser, os and device from the agent string', async () => {
    const chrome = await deriveMetadata(request({ 'user-agent': AGENTS.chromeMac }), 'salt');
    expect(chrome).toMatchObject({ browser: 'Chrome', os: 'macOS', device: 'desktop' });

    const safari = await deriveMetadata(request({ 'user-agent': AGENTS.safariIphone }), 'salt');
    expect(safari).toMatchObject({ browser: 'Safari', os: 'iOS', device: 'mobile' });

    const firefox = await deriveMetadata(request({ 'user-agent': AGENTS.firefoxWindows }), 'salt');
    expect(firefox).toMatchObject({ browser: 'Firefox', os: 'Windows', device: 'desktop' });

    const edge = await deriveMetadata(request({ 'user-agent': AGENTS.edgeWindows }), 'salt');
    expect(edge).toMatchObject({ browser: 'Edge', os: 'Windows' });

    const tablet = await deriveMetadata(
      request({ 'user-agent': AGENTS.chromeAndroidTablet }),
      'salt',
    );
    expect(tablet).toMatchObject({ os: 'Android', device: 'tablet' });
  });

  it('prefers client hints over the agent string', async () => {
    const metadata = await deriveMetadata(
      request({
        'user-agent': AGENTS.chromeMac,
        'sec-ch-ua': '"Chromium";v="140", "Microsoft Edge";v="140"',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-mobile': '?1',
      }),
      'salt',
    );
    expect(metadata).toMatchObject({ browser: 'Edge', os: 'Windows', device: 'mobile' });
  });

  it('leaves fields out rather than guessing', async () => {
    const metadata = await deriveMetadata(request({}), 'salt');
    expect(metadata.browser).toBeUndefined();
    expect(metadata.os).toBeUndefined();
    expect(metadata.device).toBeUndefined();
    expect('country' in metadata).toBe(false);
  });

  it('spots automation', () => {
    expect(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
    expect(isBot('curl/8.7.1')).toBe(true);
    expect(isBot(AGENTS.chromeMac)).toBe(false);
  });
});

describe('geo', () => {
  it("reads Cloudflare's own properties first", async () => {
    const metadata = await deriveMetadata(
      request({ 'cf-ipcountry': 'US' }, { country: 'GB', region: 'England', city: 'London' }),
      'salt',
    );
    expect(metadata).toMatchObject({ country: 'GB', region: 'England', city: 'London' });
  });

  it('falls back to proxy headers and decodes them', async () => {
    const metadata = await deriveMetadata(
      request({ 'x-vercel-ip-country': 'FR', 'x-vercel-ip-city': 'Saint-%C3%89tienne' }),
      'salt',
    );
    expect(metadata).toMatchObject({ country: 'FR', city: 'Saint-Étienne' });
  });
});

describe('visitor digest', () => {
  const headers = { 'user-agent': AGENTS.chromeMac, 'cf-connecting-ip': '203.0.113.7' };

  it('is stable for the same reader on the same site', async () => {
    const first = await deriveMetadata(request(headers), 'shop.example.com');
    const second = await deriveMetadata(request(headers), 'shop.example.com');
    expect(first.visitor).toBe(second.visitor);
  });

  it('differs between sites so ids cannot be joined across them', async () => {
    const shop = await deriveMetadata(request(headers), 'shop.example.com');
    const blog = await deriveMetadata(request(headers), 'blog.example.com');
    expect(shop.visitor).not.toBe(blog.visitor);
  });

  it('differs between readers', async () => {
    const one = await deriveMetadata(request(headers), 'salt');
    const two = await deriveMetadata(
      request({ ...headers, 'cf-connecting-ip': '203.0.113.8' }),
      'salt',
    );
    expect(one.visitor).not.toBe(two.visitor);
  });

  it('is absent when there is nothing to identify', async () => {
    const metadata = await deriveMetadata(request({}), 'salt');
    expect(metadata.visitor).toBeUndefined();
  });
});
