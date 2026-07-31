import type { Queue } from '@cloudflare/workers-types';
import { env } from 'cloudflare:workers';

import type { WebhookEventPayload, WebhookEventType } from './registry';

// Webhook events ride the stet-jobs queue as the deliver-webhook job. The
// envelope is written here instead of calling @repo/jobs enqueue() so the
// dependency stays one-way: @repo/jobs imports this package for the job
// handler, so importing it back would be a workspace cycle. The shape must
// match JobEnvelope in @repo/jobs, which the job's schema re-validates on
// consume.
type ProducerEnv = {
  JOBS: Queue<{ name: 'deliver-webhook'; payload: unknown }>;
};

export type EmitWebhookOptions<TType extends WebhookEventType> = {
  organizationId: string;
  type: TType;
  payload: WebhookEventPayload<TType>;
  // Deliver to this one endpoint regardless of its subscriptions (used by
  // the settings page's test send).
  endpointId?: string;
};

// Fire-and-forget, like enqueue(): endpoint fan-out happens in the delivery
// job, so the request path pays for one queue send no matter how many
// endpoints are registered. The event id and timestamp are fixed here so
// webhook-id stays stable across queue retries and receivers can dedupe.
export async function emitWebhookEvent<TType extends WebhookEventType>(
  options: EmitWebhookOptions<TType>,
): Promise<void> {
  const producer = (env as unknown as ProducerEnv).JOBS;
  await producer.send({
    name: 'deliver-webhook',
    payload: {
      id: crypto.randomUUID(),
      organizationId: options.organizationId,
      type: options.type,
      payload: options.payload,
      timestamp: new Date().toISOString(),
      endpointId: options.endpointId,
    },
  });
}

export type RedeliverWebhookOptions = {
  organizationId: string;
  endpointId: string;
  eventId: string;
  type: WebhookEventType;
  payload: unknown;
  timestamp: string;
};

// Re-runs a recorded delivery with its original event id and timestamp, so
// the existing ledger row is reused (attempts increment) and receivers can
// still dedupe on webhook-id. The payload is unknown rather than typed: it
// comes back out of the ledger, not from a call site, and the job schema
// re-validates it on consume.
export async function redeliverWebhookEvent(options: RedeliverWebhookOptions): Promise<void> {
  const producer = (env as unknown as ProducerEnv).JOBS;
  await producer.send({
    name: 'deliver-webhook',
    payload: {
      id: options.eventId,
      organizationId: options.organizationId,
      type: options.type,
      payload: options.payload,
      timestamp: options.timestamp,
      endpointId: options.endpointId,
    },
  });
}
