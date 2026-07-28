import { capture, upsertOrganizationGroup } from '@repo/analytics/server';
import { BillingError, members } from '@repo/billing/server';
import type { Mailer } from '@repo/mail';
import { notify } from '@repo/notifications/client';
import { startWorkflow } from '@repo/workflows/client';
import { APIError } from 'better-auth/api';
import type { OrganizationOptions } from 'better-auth/plugins';

import { accessControl, roles } from './access.ts';
import { purgeAssets } from './assets.ts';
import { emitWebhook } from './webhook.ts';

type MemberJoined = {
  user: { id: string; name: string };
  organization: { id: string; name: string };
};

/**
 * Invitation acceptances fire afterAcceptInvitation only; direct adds (and the
 * creator on organization create) fire afterAddMember only, so the two never
 * double-notify. The creator case fans out to a brand-new org with no other
 * members, which notifies nobody.
 */
async function onMemberJoined({ user, organization }: MemberJoined): Promise<void> {
  // Everyone already in the org except the joiner. Best-effort: a queue
  // hiccup must never fail the join request.
  try {
    await notify({
      type: 'member-joined',
      to: { organizationId: organization.id, except: [user.id] },
      payload: {
        memberName: user.name,
        organizationName: organization.name,
      },
    });
  } catch (error) {
    console.error(
      `[auth] Failed to enqueue member-joined notification for org ${organization.id}:`,
      error,
    );
  }
  await emitWebhook({
    organizationId: organization.id,
    type: 'member.joined',
    payload: { userId: user.id, userName: user.name },
  });
}

/**
 * Organizations with invitations, roles, and per-plan member caps. `baseURL`
 * builds the invite links that go out by email.
 */
export function organizationOptions({ baseURL, mailer }: { baseURL: string; mailer: Mailer }) {
  return {
    // Custom statements add the apiKey resource so admins (not just owners)
    // manage organization API keys; see ./access.ts.
    ac: accessControl,
    roles,
    // Per-plan member cap, enforced by Better Auth when members are added and
    // when invitations are accepted.
    membershipLimit: async (_user, limitedOrganization) => {
      return (await members.cap(limitedOrganization.id)) ?? Number.MAX_SAFE_INTEGER;
    },
    organizationHooks: {
      beforeDeleteOrganization: async ({ organization }) => {
        await purgeAssets('organization', organization.id);
      },
      // The group gives OpenPanel a display name for the organization so
      // org-level views read as names, not ids.
      afterCreateOrganization: async ({ organization, user }) => {
        upsertOrganizationGroup({ id: organization.id, name: organization.name });
        capture('organization_created', { userId: user.id, organizationId: organization.id });
      },
      // The membershipLimit backstop only fires when an invitee accepts;
      // checking at invite time puts the error in front of the person who can
      // actually fix it (the inviter).
      beforeCreateInvitation: async ({ invitation }) => {
        try {
          await members.require(invitation.organizationId);
        } catch (error) {
          if (error instanceof BillingError) {
            throw new APIError('FORBIDDEN', { message: error.message });
          }
          throw error;
        }
      },
      afterAcceptInvitation: onMemberJoined,
      afterAddMember: onMemberJoined,
    },
    sendInvitationEmail: async (data) => {
      await mailer.sendOrganizationInvitation({
        to: data.email,
        inviterName: data.inviter.user.name,
        organizationName: data.organization.name,
        inviteLink: `${baseURL}/invite/${data.id}`,
      });
      await emitWebhook({
        organizationId: data.organization.id,
        type: 'invitation.created',
        payload: { invitationId: data.id, email: data.email, role: data.role },
      });
      // The stable instance id makes re-sent invitations reuse the running
      // reminder chain instead of starting a second one; create() throws on a
      // duplicate id. Best-effort: a workflow hiccup must never fail the
      // invite request.
      try {
        await startWorkflow(
          'invitation-reminder',
          { invitationId: data.id },
          { id: `invitation-reminder-${data.id}` },
        );
      } catch (error) {
        console.error(`[auth] Failed to start reminder workflow for invitation ${data.id}:`, error);
      }
    },
  } satisfies OrganizationOptions;
}
