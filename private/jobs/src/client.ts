import type { Queue } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';

import type { JobEnvelope, JobName, JobPayload } from './registry';

// The producer side of the JOBS queue binding (apps/web/wrangler.jsonc).
// Cloudflare.Env is only populated by the app's generated types, so this
// package names the one binding it needs and casts once at the boundary.
type ProducerEnv = {
  JOBS: Queue<JobEnvelope>;
};

export type EnqueueOptions = {
  // Seconds to hold the message before it becomes visible to the consumer.
  delaySeconds?: number;
};

// Fire-and-forget: there is no result or completion signal at the call site.
// Anything that needs progress or an outcome should be a workflow instead
// (see @repo/workflows).
export async function enqueue<TName extends JobName>(
  name: TName,
  payload: JobPayload<TName>,
  options?: EnqueueOptions,
): Promise<void> {
  const producer = (env as ProducerEnv).JOBS;
  await producer.send({ name, payload }, { delaySeconds: options?.delaySeconds });
}
