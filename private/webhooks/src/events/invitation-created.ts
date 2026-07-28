import { z } from 'zod';

import { defineWebhookEvent } from '../define';

export const invitationCreated = defineWebhookEvent({
  type: 'invitation.created',
  schema: z.object({
    invitationId: z.string(),
    email: z.string(),
    role: z.string(),
  }),
});
