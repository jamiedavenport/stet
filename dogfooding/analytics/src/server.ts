import { createAnalytics } from '@stetcms/analytics/client';
import type { TrackArgs } from '@stetcms/analytics';
import { env, waitUntil } from 'cloudflare:workers';

import type { Analytics } from './plan';

type Events = Analytics['$types']['events'];
type WorkerEnv = { BETTER_AUTH_URL: string };

/**
 * Records a product event from the Worker, where the domain truths happen: an
 * ad blocker or a closed tab cannot lose one. Name and props are typed from
 * the plan in ./plan.
 *
 * @example
 * ```ts
 * capture({ organizationId }, 'subscription.started', { plan: plan.name });
 * ```
 */
export function capture<TName extends keyof Events>(
  context: { userId?: string; organizationId?: string },
  name: TName,
  ...args: TrackArgs<Events[TName]>
): void {
  // A client per call, because context is fixed at construction and two
  // requests in one isolate would otherwise stamp each other's identity on.
  const analytics = createAnalytics<Analytics>({
    endpoint: `${(env as WorkerEnv).BETTER_AUTH_URL}/api/analytics`,
    context,
    autoPageviews: false,
  });

  analytics.track(name, ...args);
  waitUntil(analytics.flush());
}
