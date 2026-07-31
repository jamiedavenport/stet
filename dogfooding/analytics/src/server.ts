import * as Sentry from '@sentry/cloudflare';
import { log } from '@repo/logging';
import { DEFAULT_ORIGIN } from '@stetcms/analytics';
import { env, waitUntil } from 'cloudflare:workers';

import { toIngestBatch } from './batch';
import type { Identity } from './batch';
import type { Analytics } from './plan';

// Named here and cast once at the boundary, because Cloudflare.Env is only
// populated by the app's generated types.
type AnalyticsEnv = {
  STET_API_KEY?: string;
  STET_ORIGIN?: string;
};

type Events = Analytics['$types']['events'];
type EventName = keyof Events;

// Props stay optional while every one of them is, so an event carrying none
// captures with just its identity.
type PropsOption<TName extends EventName> =
  Partial<Events[TName]> extends Events[TName]
    ? { props?: Events[TName] }
    : { props: Events[TName] };

export type CaptureOptions<TName extends EventName> = {
  /** Attributes the event to a user. Omit outside a user's request. */
  userId?: string;
  /** Attributes the event to an organization. */
  organizationId?: string;
} & PropsOption<TName>;

/**
 * Records a product event from the Worker, where domain truths happen: an ad
 * blocker or a closed tab cannot lose one. Name and props are typed from the
 * plan in ./plan and validated before sending.
 *
 * Best-effort and non-blocking. It never throws and never delays the response,
 * so a failure to record a signup can never fail the signup.
 *
 * @example
 * ```ts
 * capture('subscription.started', {
 *   organizationId: subscription.referenceId,
 *   props: { plan: plan.name },
 * });
 * ```
 */
export function capture<TName extends EventName>(
  name: TName,
  options: CaptureOptions<TName>,
): void {
  const { STET_API_KEY: apiKey, STET_ORIGIN: origin } = env as AnalyticsEnv;
  if (apiKey === undefined || apiKey === '') {
    log.info('analytics', `${name} not sent: STET_API_KEY is unset`);
    return;
  }

  const identity: Identity = { userId: options.userId, organizationId: options.organizationId };
  const props = (options as { props?: Record<string, unknown> }).props ?? {};
  deliver(send(name, props, identity, apiKey, origin ?? DEFAULT_ORIGIN));
}

async function send(
  name: string,
  props: Record<string, unknown>,
  identity: Identity,
  apiKey: string,
  origin: string,
): Promise<void> {
  const batch = await toIngestBatch(name, props, identity);
  const response = await fetch(`${origin}/api/v1/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(batch),
  });
  if (!response.ok) {
    throw new Error(`POST ${origin}/api/v1/events responded ${response.status}`);
  }
}

function deliver(delivery: Promise<void>): void {
  // Deliberately swallowed, so Sentry is the only thing that would ever
  // surface a plan that has drifted or a key that has been revoked.
  const reported = delivery.catch((error: unknown) => {
    Sentry.captureException(error);
  });
  try {
    waitUntil(reported);
  } catch {
    // No request context to hang it on, so let the promise float instead.
    void reported;
  }
}
