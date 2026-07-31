import { z } from 'zod';

import { defineWebhookEvent } from '../define';

// Fired for both invitation acceptances and direct adds (see the
// organization hooks in @repo/auth).
export const memberJoined = defineWebhookEvent({
  type: 'member.joined',
  schema: z.object({
    userId: z.string(),
    userName: z.string(),
  }),
});
