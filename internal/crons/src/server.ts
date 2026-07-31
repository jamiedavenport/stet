import type { ScheduledController } from '@cloudflare/workers-types';
import { createLogger } from '@repo/logging';

import type { CronHandler } from './define';
import { registry } from './registry';

// The scheduled handler, spread into the worker's default export in
// apps/web/src/server.ts. Keep crons thin: anything heavier than a quick
// D1 pass should enqueue a job or start a workflow, because a crashed cron
// invocation is simply gone — there is no retry.
export async function handleScheduled(controller: ScheduledController): Promise<void> {
  const log = createLogger({ cron: { name: controller.cron } });
  const handler = (registry as Record<string, CronHandler | undefined>)[controller.cron];
  if (handler === undefined) {
    log.error(
      `No handler registered for cron "${controller.cron}". ` +
        'Keep apps/web/wrangler.jsonc triggers.crons in sync with internal/crons/src/registry.ts.',
    );
    log.emit();
    return;
  }

  // No catch: an error propagates to the worker's Sentry wrapper, which is
  // what reports it. The event still records the run either way.
  try {
    await handler(log);
  } catch (error) {
    log.error(error instanceof Error ? error : String(error));
    throw error;
  } finally {
    log.emit();
  }
}
