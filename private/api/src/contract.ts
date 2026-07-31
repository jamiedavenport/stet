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
  'content.changed',
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

// Field types are inlined (not imported from the web app) to keep this file
// self-contained. The editor pins its list to this enum with a satisfies
// check, so drift in either direction fails the type check there.
export const contentFieldTypeSchema = z.enum([
  'text',
  'rich_text',
  'number',
  'checkbox',
  'date',
  'select',
  'multi_select',
  'link',
  'person',
  'asset',
  'reference',
  'multi_reference',
]);

export type ContentFieldType = z.infer<typeof contentFieldTypeSchema>;

export const contentDeprecationSchema = z.object({
  /** When the field was deleted from the model. */
  at: z.iso.datetime(),
  /** Who deleted it; absent when no signed-in user did, or the account is gone. */
  by: z.string().optional(),
});

export const contentFieldSchema = z.object({
  key: z.string(),
  name: z.string(),
  type: contentFieldTypeSchema,
  /** Choices of a select or multi-select field; empty for other types. */
  options: z.array(z.object({ name: z.string(), color: z.string() })),
  /** Slug of the collection a reference or multi-reference field points at. */
  collection: z.string().optional(),
  /**
   * Present once the field has been deleted from the model, naming when and
   * by whom so a stale key can be traced back to the change that retired it.
   * Editors stop seeing the field, but entries keep the last value it held
   * and go on returning it, so a deletion costs a running site nothing. A
   * generated client turns it into a deprecation rather than dropping the
   * key, so code reading it keeps compiling. The key and its values go for
   * good only when a developer purges the field from the Danger Zone, after
   * which it leaves this list.
   */
  deprecated: contentDeprecationSchema.optional(),
});

export const contentTypeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  /** A collection holds many entries; a map holds exactly one. */
  kind: z.enum(['collection', 'map']),
  fields: z.array(contentFieldSchema),
});

export type ContentType = z.infer<typeof contentTypeSchema>;

// Values follow the field's type: text/date/link are strings, rich text is
// markdown, number/checkbox their primitives, selects are option names (an
// array for multi-select), person is { id, name }, asset is { id, url, name,
// contentType, size }, reference is { id, slug, title } (an array for
// multi-reference, with deleted targets dropped). Absent means the field was
// never set; a deleted single-reference or asset target reads as null. A
// deprecated key is here too, frozen at the last value it was given.
export const contentEntrySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  fields: z.record(z.string(), z.unknown()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ContentEntry = z.infer<typeof contentEntrySchema>;

const contentNotFound = {
  NOT_FOUND: { message: 'No content type with that slug in this organization.' },
} as const;

const getContentModel = oc
  .errors(authErrors)
  .route({
    method: 'GET',
    path: '/model',
    summary: 'Content model',
    description:
      'Every collection and map in the organization with its fields. The generated client is ' +
      'typed from this. Deleted fields are still listed, carrying a `deprecated` record of when ' +
      'and by whom, so a client regenerated after a deletion marks the key instead of dropping ' +
      'it and entries go on returning the last value it held.',
    tags: ['Content'],
  })
  .output(z.object({ types: z.array(contentTypeSchema) }));

const listContent = oc
  .errors({ ...authErrors, ...contentNotFound })
  .route({
    method: 'GET',
    path: '/content/{type}',
    summary: 'List entries',
    description:
      "A content type's entries with resolved field values; rich text bodies are markdown as " +
      'last saved by the realtime room. A map returns its single entry as a one-element list.',
    tags: ['Content'],
  })
  .input(z.object({ type: z.string() }))
  .output(z.object({ type: contentTypeSchema, entries: z.array(contentEntrySchema) }));

const getContent = oc
  .errors({
    ...authErrors,
    NOT_FOUND: { message: 'No such content type or entry in this organization.' },
  })
  .route({
    method: 'GET',
    path: '/content/{type}/{slug}',
    summary: 'Get one entry',
    description: 'One entry of a collection, addressed by its slug.',
    tags: ['Content'],
  })
  .input(z.object({ type: z.string(), slug: z.string() }))
  .output(contentEntrySchema);

// Analytics. Events reach Stet from the route the developer mounts in their
// own app with @stetcms/analytics, never from a browser directly: the key
// stays server-side, and the reader's address and user agent are reduced to
// `metadata` there so they never travel here.
export const analyticsMetadataSchema = z.object({
  /** Day-scoped visitor digest computed by the caller. Never an address. */
  visitor: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  device: z.enum(['desktop', 'mobile', 'tablet']).optional(),
});

export type AnalyticsMetadata = z.infer<typeof analyticsMetadataSchema>;

// Analytics is metered on events rather than on API requests, so these two
// never spend the organization's request quota and can never answer
// QUOTA_EXCEEDED. Their volume is bounded by a rate limit of its own.
const analyticsErrors = {
  UNAUTHORIZED: authErrors.UNAUTHORIZED,
  ...rateLimitError,
} as const;

export const analyticsEventSchema = z.object({
  /** `$pageview`, or an event from the organization's tracking plan. */
  name: z.string().min(1).max(120),
  props: z.record(z.string(), z.unknown()).default({}),
  /** Epoch milliseconds, stamped in the browser when the event happened. */
  timestamp: z.number().int().nonnegative(),
  url: z.string().optional(),
  referrer: z.string().optional(),
});

const ingestEvents = oc
  .errors(analyticsErrors)
  .route({
    method: 'POST',
    path: '/events',
    summary: 'Record events',
    description:
      'Stores a batch of analytics events. Sent by the handler you mounted in your own app, ' +
      'which validates them against your tracking plan first. Query strings are reduced to ' +
      'their campaign parameters on the way in.',
    tags: ['Analytics'],
  })
  .input(
    z.object({
      context: z.record(z.string(), z.unknown()).default({}),
      metadata: analyticsMetadataSchema.default({}),
      events: z.array(analyticsEventSchema).min(1).max(100),
    }),
  )
  .output(z.object({ accepted: z.number().int() }));

const syncEventSchema = oc
  .errors(analyticsErrors)
  .route({
    method: 'PUT',
    path: '/events/schema',
    summary: 'Publish the tracking plan',
    description:
      "Replaces the organization's known events with the ones your code declares, so the " +
      'dashboard can offer them. Sent by @stetcms/vite and `stet sync`.',
    tags: ['Analytics'],
  })
  .input(
    z.object({
      events: z.array(z.object({ name: z.string().min(1), props: z.array(z.string()) })),
    }),
  )
  .output(z.object({ synced: z.number().int() }));

export const contract = {
  health,
  analytics: {
    ingest: ingestEvents,
    sync: syncEventSchema,
  },
  content: {
    model: getContentModel,
    list: listContent,
    get: getContent,
  },
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
