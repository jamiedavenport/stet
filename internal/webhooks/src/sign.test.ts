import { Webhook } from 'standardwebhooks';
import { describe, expect, it } from 'vite-plus/test';

import { generateWebhookSecret } from './secret';
import { webhookHeaders } from './sign';
import { isDeliverableWebhookUrl } from './url';

const body = JSON.stringify({ type: 'ping', timestamp: '2026-07-25T12:00:00.000Z', data: {} });

describe('webhookHeaders', () => {
  it('produces headers any Standard Webhooks library verifies', () => {
    const secret = generateWebhookSecret();
    const headers = webhookHeaders({ id: 'evt-1', timestamp: new Date(), body, secret });
    expect(new Webhook(secret).verify(body, headers)).toEqual(JSON.parse(body));
  });

  it('sends the attempt timestamp in seconds', () => {
    const timestamp = new Date('2026-07-25T12:34:56.789Z');
    const headers = webhookHeaders({
      id: 'evt-1',
      timestamp,
      body,
      secret: generateWebhookSecret(),
    });
    expect(headers['webhook-timestamp']).toBe(String(Math.floor(timestamp.getTime() / 1000)));
    expect(headers['webhook-id']).toBe('evt-1');
  });

  it('signs with both secrets during a rotation grace window', () => {
    const oldSecret = generateWebhookSecret();
    const newSecret = generateWebhookSecret();
    const headers = webhookHeaders({
      id: 'evt-1',
      timestamp: new Date(),
      body,
      secret: newSecret,
      previousSecret: oldSecret,
    });
    expect(headers['webhook-signature'].split(' ')).toHaveLength(2);
    expect(new Webhook(newSecret).verify(body, headers)).toEqual(JSON.parse(body));
    expect(new Webhook(oldSecret).verify(body, headers)).toEqual(JSON.parse(body));
  });

  it('rejects a tampered body', () => {
    const secret = generateWebhookSecret();
    const headers = webhookHeaders({ id: 'evt-1', timestamp: new Date(), body, secret });
    expect(() => new Webhook(secret).verify(`${body} `, headers)).toThrow();
  });
});

describe('generateWebhookSecret', () => {
  it('creates unique whsec_ base64 secrets', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[A-Za-z0-9+/]+=*$/);
    expect(generateWebhookSecret()).not.toBe(secret);
  });
});

describe('isDeliverableWebhookUrl', () => {
  it('accepts public https URLs', () => {
    expect(isDeliverableWebhookUrl('https://example.com/hooks')).toBe(true);
  });

  it('allows localhost over http for local development', () => {
    expect(isDeliverableWebhookUrl('http://localhost:8787/hooks')).toBe(true);
    expect(isDeliverableWebhookUrl('http://127.0.0.1/hooks')).toBe(true);
  });

  it('rejects plain http elsewhere', () => {
    expect(isDeliverableWebhookUrl('http://example.com/hooks')).toBe(false);
  });

  it('rejects IP literals', () => {
    expect(isDeliverableWebhookUrl('https://10.0.0.5/hooks')).toBe(false);
    expect(isDeliverableWebhookUrl('https://[2001:db8::1]/hooks')).toBe(false);
  });

  it('rejects other schemes and garbage', () => {
    expect(isDeliverableWebhookUrl('ftp://example.com')).toBe(false);
    expect(isDeliverableWebhookUrl('not a url')).toBe(false);
  });
});
