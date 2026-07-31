import { deliverWebhookEvent, deliverWebhookSchema } from '@repo/webhooks/server';

import { defineJob } from '../define';

// Enqueued by emitWebhookEvent() in @repo/webhooks/client. The fan-out logic
// (endpoint matching, signing, POSTs, the delivery ledger) lives next to the
// webhook event registry; this definition only gives it a seat on the queue.
export const deliverWebhookJob = defineJob({
  name: 'deliver-webhook',
  schema: deliverWebhookSchema,
  handle: async (payload) => {
    await deliverWebhookEvent(payload);
  },
});
