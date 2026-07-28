import type { MessageBatch } from '@cloudflare/workers-types';
import { createLogger, ExpectedFailure } from '@repo/logging';
import { createMailer } from '@repo/mail';
import * as Sentry from '@sentry/cloudflare';
import { z } from 'zod';

import type { AssetStorage, JobContext } from './define';
import { registry } from './registry';
import type { JobName } from './registry';

// What the consumer needs from the worker environment. The real Env
// (apps/web) satisfies this structurally.
export type JobsEnv = {
  RESEND_API_KEY?: string;
  MAIL_FROM: string;
  BETTER_AUTH_URL: string;
  STORAGE: AssetStorage;
};

const envelopeSchema = z.object({
  name: z.enum(Object.keys(registry) as [JobName, ...JobName[]]),
  payload: z.unknown(),
});

// The queue consumer, spread into the worker's default export in
// apps/web/src/server.ts. A thrown handler leaves the message unacked, so the
// queue redelivers it with backoff and dead-letters it after max_retries.
export async function handleQueue(batch: MessageBatch<unknown>, env: JobsEnv): Promise<void> {
  const context: JobContext = {
    mailer: createMailer({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM }),
    baseURL: env.BETTER_AUTH_URL,
    storage: env.STORAGE,
  };

  for (const message of batch.messages) {
    const log = createLogger({
      job: { messageId: message.id, attempt: message.attempts },
    });
    try {
      const envelope = envelopeSchema.parse(message.body);
      log.set({ job: { name: envelope.name } });
      await registry[envelope.name].run(envelope.payload, context);
      message.ack();
    } catch (error) {
      // The retry keeps the queue moving, so nothing rethrows and the worker's
      // Sentry wrapper never sees this. Report it here or a job that fails
      // every attempt is invisible until someone reads the dead letter queue.
      if (!(error instanceof ExpectedFailure)) {
        Sentry.captureException(error);
      }
      log.error(error instanceof Error ? error : String(error));
      message.retry();
    } finally {
      log.emit();
    }
  }
}
