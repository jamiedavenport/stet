import type { Queue } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';

import type { NotificationPayload, NotificationType } from './registry';
import type { RecipientSelector } from './selector';

export type { RecipientSelector };

// Notifications ride the stet-jobs queue as the deliver-notification job.
// The envelope is written here instead of calling @repo/jobs enqueue() so
// the dependency stays one-way: @repo/jobs imports this package for the job
// handler, so importing it back would be a workspace cycle. The shape must
// match JobEnvelope in @repo/jobs, which the job's schema re-validates on
// consume.
type ProducerEnv = {
  JOBS: Queue<{ name: 'deliver-notification'; payload: unknown }>;
};

export type NotifyOptions<TType extends NotificationType> = {
  type: TType;
  to: RecipientSelector;
  payload: NotificationPayload<TType>;
};

// Fire-and-forget, like enqueue(): recipients are expanded and preferences
// applied in the delivery job, so the request path only pays for one queue
// send no matter how large the fan-out is.
export async function notify<TType extends NotificationType>(
  options: NotifyOptions<TType>,
): Promise<void> {
  const producer = (env as unknown as ProducerEnv).JOBS;
  await producer.send({
    name: 'deliver-notification',
    payload: { type: options.type, to: options.to, payload: options.payload },
  });
}
