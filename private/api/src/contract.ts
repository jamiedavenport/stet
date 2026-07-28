import { oc } from '@orpc/contract';
import { z } from 'zod';

// Wire types are JSON-native: dates travel as ISO 8601 strings so the
// generated OpenAPI document describes exactly what goes over HTTP.
//
// This file is self-contained (no relative imports) because
// scripts/generate-openapi.ts runs it directly under Node.
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type Organization = z.infer<typeof organizationSchema>;

// The worker throttles every /api/v1 request per key (or IP) before the oRPC
// handler runs, so this error applies to the whole surface, health included.
// Exported so the worker's 429 response can carry the exact declared body.
export const rateLimitError = {
  RATE_LIMITED: {
    status: 429,
    message: 'Too many requests. Try again shortly.',
  },
} as const;

// Shared by every procedure that requires an API key. Exported so the server
// implementation can throw the same messages the contract declares. Every
// authenticated request consumes one unit of the organization's API request
// quota, so the quota error applies across the keyed surface.
export const authErrors = {
  UNAUTHORIZED: {
    message: 'Authentication required. Pass an organization API key in the `x-api-key` header.',
  },
  QUOTA_EXCEEDED: {
    status: 429,
    message: "The organization's API request limit for this period has been reached.",
  },
  ...rateLimitError,
} as const;

const health = oc
  .errors(rateLimitError)
  .route({
    method: 'GET',
    path: '/health',
    summary: 'Health check',
    description: 'Public liveness probe. Returns ok when the API is reachable.',
    tags: ['System'],
  })
  .output(z.object({ status: z.literal('ok') }));

const getOrg = oc
  .errors(authErrors)
  .route({
    method: 'GET',
    path: '/org',
    summary: 'Current organization',
    description: 'Details of the organization the API key is scoped to.',
    tags: ['Organization'],
  })
  .output(organizationSchema);

// Plan and feature names are inlined (not imported from @repo/billing) to
// keep this file self-contained; the enums mirror the catalog in
// @repo/billing (plans.ts and features.ts).
const usageSchema = z.object({
  feature: z.enum(['members', 'apiRequests', 'storage']),
  used: z.number().int(),
  // null means the feature is unlimited on the organization's plan.
  cap: z.number().int().nullable(),
  // 'month' usage resets each calendar month (UTC); null never resets.
  window: z.enum(['month']).nullable(),
});

export const orgBillingSchema = z.object({
  plan: z.enum(['free', 'paid']),
  status: z.string().nullable(),
  seats: z.number().int().nullable(),
  periodEnd: z.iso.datetime().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  usage: z.array(usageSchema),
});

export type OrgBilling = z.infer<typeof orgBillingSchema>;

const getOrgBilling = oc
  .errors(authErrors)
  .route({
    method: 'GET',
    path: '/org/billing',
    summary: 'Organization billing',
    description:
      "The organization's plan, subscription state, and usage against the plan's limits.",
    tags: ['Organization'],
  })
  .output(orgBillingSchema);

export const noteSchema = z.object({
  /** The note as plain text, one line per block. Null until the room first saves. */
  text: z.string().nullable(),
  words: z.number().int(),
  savedAt: z.iso.datetime().nullable(),
});

export type Note = z.infer<typeof noteSchema>;

const getNote = oc
  .errors(authErrors)
  .route({
    method: 'GET',
    path: '/org/notes',
    summary: 'Shared note',
    description:
      "The organization's collaborative note as last saved by the realtime room. It trails " +
      'live editing by a few seconds, so `savedAt` says which version this is.',
    tags: ['Organization'],
  })
  .output(noteSchema);

// Event types are inlined (not imported from @repo/webhooks) to keep this
// file self-contained. The registry in @repo/webhooks pins itself to this
// enum with a satisfies check, so drift in either direction fails the type
// check there.
export const webhookEventTypeSchema = z.enum([
  'member.joined',
  'invitation.created',
  'subscription.started',
  'subscription.canceled',
  'ping',
]);

export type WebhookEventType = z.infer<typeof webhookEventTypeSchema>;

export const webhookEndpointSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(webhookEventTypeSchema),
  enabled: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;

// The signing secret is only returned by create and rotate-secret.
export const webhookEndpointWithSecretSchema = webhookEndpointSchema.extend({
  secret: z.string(),
});

export const webhookDeliverySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  status: z.enum(['success', 'failed']),
  responseStatus: z.number().int().nullable(),
  attempts: z.number().int(),
  createdAt: z.iso.datetime(),
});

export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;

const webhookNotFound = {
  NOT_FOUND: { message: 'No webhook endpoint with that id in this organization.' },
} as const;

const listWebhooks = oc
  .errors(authErrors)
  .route({
    method: 'GET',
    path: '/webhooks',
    summary: 'List webhook endpoints',
    description: "The organization's webhook endpoints, without their signing secrets.",
    tags: ['Webhooks'],
  })
  .output(z.array(webhookEndpointSchema));

const createWebhook = oc
  .errors({
    ...authErrors,
    BAD_REQUEST: { message: 'Webhook URLs must be https (plain http is allowed for localhost).' },
  })
  .route({
    method: 'POST',
    path: '/webhooks',
    summary: 'Create a webhook endpoint',
    description:
      'Registers an endpoint for the given event types. The response includes the signing ' +
      'secret; verify deliveries with any Standard Webhooks library.',
    tags: ['Webhooks'],
  })
  .input(
    z.object({
      url: z.url(),
      events: z.array(webhookEventTypeSchema).min(1),
    }),
  )
  .output(webhookEndpointWithSecretSchema);

const deleteWebhook = oc
  .errors({ ...authErrors, ...webhookNotFound })
  .route({
    method: 'DELETE',
    path: '/webhooks/{id}',
    summary: 'Delete a webhook endpoint',
    description: 'Removes the endpoint and its delivery history.',
    tags: ['Webhooks'],
  })
  .input(z.object({ id: z.string() }))
  .output(z.object({ id: z.string() }));

const rotateWebhookSecret = oc
  .errors({ ...authErrors, ...webhookNotFound })
  .route({
    method: 'POST',
    path: '/webhooks/{id}/rotate-secret',
    summary: 'Rotate a webhook signing secret',
    description:
      'Issues a new signing secret. The previous secret keeps signing deliveries for 24 hours ' +
      'so receivers can roll over without downtime.',
    tags: ['Webhooks'],
  })
  .input(z.object({ id: z.string() }))
  .output(webhookEndpointWithSecretSchema);

const listWebhookDeliveries = oc
  .errors({ ...authErrors, ...webhookNotFound })
  .route({
    method: 'GET',
    path: '/webhooks/{id}/deliveries',
    summary: 'List recent deliveries',
    description: 'The most recent delivery attempts for the endpoint, newest first.',
    tags: ['Webhooks'],
  })
  .input(z.object({ id: z.string() }))
  .output(z.array(webhookDeliverySchema));

export const contract = {
  health,
  org: {
    current: getOrg,
    billing: getOrgBilling,
    note: getNote,
  },
  webhooks: {
    list: listWebhooks,
    create: createWebhook,
    delete: deleteWebhook,
    rotateSecret: rotateWebhookSecret,
    deliveries: listWebhookDeliveries,
  },
};
