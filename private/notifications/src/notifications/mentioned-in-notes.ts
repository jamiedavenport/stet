import { z } from 'zod';

import { defineNotification } from '../define';

// Fired from the notes editor when a member picks someone out of the `@`
// suggestion list. Like every other definition the payload carries names, not
// ids: the rendered title is a snapshot of the moment the mention happened.
export const mentionedInNotes = defineNotification({
  type: 'mentioned-in-notes',
  label: 'Someone mentions you in the shared notes',
  schema: z.object({
    mentionedByName: z.string(),
    organizationName: z.string(),
  }),
  defaultChannels: ['app', 'email'],
  render: (payload, t) => ({
    title: t.notification_mentioned_in_notes(payload),
    href: '/app/notes',
  }),
});
