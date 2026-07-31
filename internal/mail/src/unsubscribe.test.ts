import { describe, expect, it } from 'vite-plus/test';

import { createUnsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from './unsubscribe';

const secret = 'test-secret-0123456789abcdef';

describe('unsubscribe tokens', () => {
  it('round-trips a subject', async () => {
    const token = await createUnsubscribeToken(secret, {
      kind: 'notification-emails',
      id: 'user-1',
    });
    expect(await verifyUnsubscribeToken(secret, token)).toEqual({
      kind: 'notification-emails',
      id: 'user-1',
    });
  });

  it('round-trips the reminder kind', async () => {
    const token = await createUnsubscribeToken(secret, {
      kind: 'invitation-reminders',
      id: 'invite-9',
    });
    expect(await verifyUnsubscribeToken(secret, token)).toEqual({
      kind: 'invitation-reminders',
      id: 'invite-9',
    });
  });

  it('rejects a tampered payload', async () => {
    const token = await createUnsubscribeToken(secret, {
      kind: 'notification-emails',
      id: 'user-1',
    });
    const [, signature] = token.split('.');
    const forged = await createUnsubscribeToken(secret, {
      kind: 'notification-emails',
      id: 'user-2',
    });
    const [forgedPayload] = forged.split('.');
    expect(await verifyUnsubscribeToken(secret, `${forgedPayload}.${signature}`)).toBeNull();
  });

  it('rejects the wrong secret', async () => {
    const token = await createUnsubscribeToken('other-secret', {
      kind: 'notification-emails',
      id: 'user-1',
    });
    expect(await verifyUnsubscribeToken(secret, token)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifyUnsubscribeToken(secret, 'not-a-token')).toBeNull();
    expect(await verifyUnsubscribeToken(secret, 'a.b.c')).toBeNull();
    expect(await verifyUnsubscribeToken(secret, '..')).toBeNull();
    expect(await verifyUnsubscribeToken(secret, '')).toBeNull();
  });

  it('builds the public URL', async () => {
    const url = await unsubscribeUrl('https://example.com', secret, {
      kind: 'notification-emails',
      id: 'user-1',
    });
    expect(url).toMatch(/^https:\/\/example\.com\/mail\/unsubscribe\?token=[A-Za-z0-9_-]+\./);
  });
});
