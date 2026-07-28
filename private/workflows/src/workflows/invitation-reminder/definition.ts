import { z } from 'zod';

import { defineWorkflow } from '../../define.ts';

export const invitationReminder = defineWorkflow({
  name: 'invitation-reminder',
  binding: 'INVITATION_REMINDER',
  className: 'InvitationReminderWorkflow',
  schema: z.object({
    invitationId: z.string(),
  }),
});

export type InvitationReminderParams = z.output<typeof invitationReminder.schema>;
