import type { MessageBatch } from '@cloudflare/workers-types';
import { ExpectedFailure } from '@repo/logging';
import * as Sentry from '@sentry/cloudflare';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import type { JobsEnv } from './server';
import { handleQueue } from './server';

const run = vi.fn();
const ack = vi.fn();
const retry = vi.fn();

vi.mock('@sentry/cloudflare', () => ({ captureException: vi.fn() }));
vi.mock('./registry', () => ({ registry: { 'send-welcome-email': { run: () => run() } } }));

// Only the consumer's own behaviour is under test, so the services it builds
// for handlers need to exist, not work.
const env: JobsEnv = {
  MAIL_FROM: 'Stet <onboarding@resend.dev>',
  BETTER_AUTH_URL: 'http://localhost:3000',
  STORAGE: {
    delete: vi.fn(),
    list: vi.fn(),
  },
};

function batchOf(name: string): MessageBatch<unknown> {
  return {
    messages: [{ id: 'message-1', attempts: 1, body: { name, payload: {} }, ack, retry }],
  } as unknown as MessageBatch<unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleQueue', () => {
  it('acks a job that succeeds', async () => {
    run.mockResolvedValue(undefined);

    await handleQueue(batchOf('send-welcome-email'), env);

    expect(ack).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
  });

  it('retries and reports a job that throws', async () => {
    run.mockRejectedValue(new Error('D1 write failed'));

    await handleQueue(batchOf('send-welcome-email'), env);

    expect(retry).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });

  it('retries an expected failure without reporting it', async () => {
    run.mockRejectedValue(new ExpectedFailure('1 of 1 deliveries failed'));

    await handleQueue(batchOf('send-welcome-email'), env);

    expect(retry).toHaveBeenCalledOnce();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports an unknown job name rather than acking it', async () => {
    await handleQueue(batchOf('removed-in-an-older-deploy'), env);

    expect(ack).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledOnce();
    expect(Sentry.captureException).toHaveBeenCalledOnce();
  });
});
