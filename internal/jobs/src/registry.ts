import type { z } from 'zod';

import { deliverNotificationJob } from './jobs/deliver-notification';
import { deliverWebhookJob } from './jobs/deliver-webhook';
import { purgeAssetsJob } from './jobs/purge-assets';
import { sendWelcomeEmail } from './jobs/send-welcome-email';

// Every job the queue can carry. Adding a job means creating a definition in
// src/jobs/ and listing it here; enqueue() and the consumer pick it up with
// full payload typing.
export const registry = {
  [deliverNotificationJob.name]: deliverNotificationJob,
  [deliverWebhookJob.name]: deliverWebhookJob,
  [purgeAssetsJob.name]: purgeAssetsJob,
  [sendWelcomeEmail.name]: sendWelcomeEmail,
} as const;

type Registry = typeof registry;
export type JobName = keyof Registry;
export type JobPayload<TName extends JobName> = z.output<Registry[TName]['schema']>;

// What actually travels on the queue. The payload is deliberately unknown
// here: the consumer re-validates it against the job's schema, which also
// protects against messages enqueued by an older deploy.
export type JobEnvelope = {
  name: JobName;
  payload: unknown;
};
