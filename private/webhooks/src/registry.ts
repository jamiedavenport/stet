import type { WebhookEventType as ContractWebhookEventType } from '@repo/api';
import type { z } from 'zod';

import type { WebhookEventDefinition } from './define';
import { invitationCreated } from './events/invitation-created';
import { memberJoined } from './events/member-joined';
import { ping } from './events/ping';
import { subscriptionCanceled, subscriptionStarted } from './events/subscription';

// Every webhook event type the app can emit. Adding one means creating a
// definition in src/events/ and listing it here; emitWebhookEvent(), the
// delivery job, the public API contract's event enum, and the settings UI
// all pick it up with full payload typing.
//
// The satisfies clause pins the registry to the enum inlined in @repo/api's
// contract (kept import-free there so OpenAPI generation runs under plain
// Node): a type here without a contract entry, or vice versa, is a compile
// error. The import is type-only, so no runtime coupling reaches the
// browser bundle or the queue consumer.
export const registry = {
  [memberJoined.type]: memberJoined,
  [invitationCreated.type]: invitationCreated,
  [subscriptionStarted.type]: subscriptionStarted,
  [subscriptionCanceled.type]: subscriptionCanceled,
  [ping.type]: ping,
} as const satisfies Record<ContractWebhookEventType, WebhookEventDefinition>;

export type Registry = typeof registry;
export type WebhookEventType = keyof Registry;
export type WebhookEventPayload<TType extends WebhookEventType> = z.output<
  Registry[TType]['schema']
>;

// Non-empty tuple for z.enum in the delivery job schema and validators.
export const webhookEventTypes = Object.keys(registry) as [WebhookEventType, ...WebhookEventType[]];
