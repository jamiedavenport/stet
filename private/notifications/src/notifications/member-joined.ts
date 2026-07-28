import { z } from 'zod';

import { defineNotification } from '../define';

// Fired from the afterAddMember organization hook in @repo/auth whenever
// someone joins an organization (invitation acceptance or a direct add). The
// payload carries names rather than ids: notification titles are snapshots
// of the moment the event happened, not live references.
export const memberJoined = defineNotification({
  type: 'member-joined',
  label: 'Someone joins your organization',
  schema: z.object({
    memberName: z.string(),
    organizationName: z.string(),
  }),
  defaultChannels: ['app', 'email'],
  render: (payload, t) => ({
    title: t.notification_member_joined(payload),
    href: '/app/organization',
  }),
});
