import { deliverNotification, deliverNotificationSchema } from '@repo/notifications/server';

import { defineJob } from '../define';

// Enqueued by notify() in @repo/notifications/client. The fan-out logic
// (recipient expansion, preference filtering, row inserts, hub pokes) lives
// next to the notification registry; this definition only gives it a seat on
// the queue.
export const deliverNotificationJob = defineJob({
  name: 'deliver-notification',
  schema: deliverNotificationSchema,
  handle: async (payload) => {
    await deliverNotification(payload);
  },
});
