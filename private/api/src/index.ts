import type { InferContractRouterInputs, InferContractRouterOutputs } from '@orpc/contract';

import { contract } from './contract';

export { contract };
export {
  authErrors,
  contentEntrySchema,
  contentFieldSchema,
  contentFieldTypeSchema,
  contentTypeSchema,
  noteSchema,
  orgBillingSchema,
  rateLimitError,
  organizationSchema,
  webhookDeliverySchema,
  webhookEndpointSchema,
  webhookEndpointWithSecretSchema,
  webhookEventTypeSchema,
} from './contract';
export type {
  ContentEntry,
  ContentFieldType,
  ContentType,
  Note,
  Organization,
  OrgBilling,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventType,
} from './contract';

export type ApiInputs = InferContractRouterInputs<typeof contract>;
export type ApiOutputs = InferContractRouterOutputs<typeof contract>;
