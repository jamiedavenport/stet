import { database, eq, schema } from '@repo/db';
import { z } from 'zod';

import { defineJob } from '../define';

// Enqueued when a user signs up (see the user create hook in @repo/auth).
// Carries only the user id: the handler re-reads the user so a stale payload
// can never email an outdated address.
export const sendWelcomeEmail = defineJob({
  name: 'send-welcome-email',
  schema: z.object({
    userId: z.string(),
  }),
  handle: async (payload, context) => {
    const db = await database();
    const user = await db.query.user.findFirst({
      where: eq(schema.user.id, payload.userId),
    });
    if (user === undefined) {
      console.log(`[jobs] send-welcome-email: user ${payload.userId} no longer exists, skipping.`);
      return;
    }
    await context.mailer.sendWelcomeEmail({
      to: user.email,
      name: user.name,
      appLink: context.baseURL,
    });
  },
});
