import { z } from 'zod';

import { defineWebhookEvent } from '../define';

// Test event sent from the webhooks settings page to a single endpoint.
export const ping = defineWebhookEvent({
  type: 'ping',
  schema: z.object({
    message: z.string(),
  }),
});
