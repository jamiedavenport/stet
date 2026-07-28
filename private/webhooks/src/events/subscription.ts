import { z } from 'zod';

import { defineWebhookEvent } from '../define';

// Fired from the Stripe subscription callbacks in @repo/auth, so they cover
// checkout and billing-portal changes alike.
export const subscriptionStarted = defineWebhookEvent({
  type: 'subscription.started',
  schema: z.object({
    plan: z.string(),
  }),
});

export const subscriptionCanceled = defineWebhookEvent({
  type: 'subscription.canceled',
  schema: z.object({
    plan: z.string(),
  }),
});
