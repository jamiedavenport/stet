import { z } from 'zod';

import { defineEvent } from './define';

// The tracking plan. Client-safe: no secrets and no server imports, so UI
// code and Worker code type their calls from the same source of truth.
//
// Identity (which user, which organization) is not part of an event's
// properties: the client stamps it via identify/group state and the server
// takes it in capture()'s options, so schemas only describe what happened.

export const userSignedUp = defineEvent({
  name: 'user_signed_up',
  schema: z.object({}),
});

export const organizationCreated = defineEvent({
  name: 'organization_created',
  schema: z.object({}),
});

export const subscriptionStarted = defineEvent({
  name: 'subscription_started',
  schema: z.object({
    // Plan name from the billing catalog (see @repo/billing).
    plan: z.string(),
  }),
});

export const subscriptionCanceled = defineEvent({
  name: 'subscription_canceled',
  schema: z.object({
    plan: z.string(),
  }),
});

export const taskCreated = defineEvent({
  name: 'task_created',
  schema: z.object({}),
});

// Every event the product can record. Adding an event means defining it
// above and listing it here; track() and capture() pick it up with full
// property typing.
export const registry = {
  [userSignedUp.name]: userSignedUp,
  [organizationCreated.name]: organizationCreated,
  [subscriptionStarted.name]: subscriptionStarted,
  [subscriptionCanceled.name]: subscriptionCanceled,
  [taskCreated.name]: taskCreated,
} as const;

export type Registry = typeof registry;
export type EventName = keyof Registry;
export type EventProperties<TName extends EventName> = z.output<Registry[TName]['schema']>;
