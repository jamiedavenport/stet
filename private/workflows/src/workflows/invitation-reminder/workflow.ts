import { database, eq, schema } from '@repo/db';
import { createMailer } from '@repo/mail';
import { unsubscribeUrl } from '@repo/mail/unsubscribe';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

import type { WorkflowsEnv } from '../../env';
import { invitationReminder } from './definition';
import type { InvitationReminderParams } from './definition';

const dayMs = 24 * 60 * 60 * 1000;

// Started when an organization invitation is sent (see sendInvitationEmail
// in @repo/auth). Sleeps until a day before the invitation expires, then
// nudges the invitee if they still have not responded. If the invite was
// accepted, rejected, or canceled in the meantime, the final step is a no-op.
export class InvitationReminderWorkflow extends WorkflowEntrypoint<
  WorkflowsEnv,
  InvitationReminderParams
> {
  async run(
    event: Readonly<WorkflowEvent<InvitationReminderParams>>,
    step: WorkflowStep,
  ): Promise<void> {
    // Params are serialized at rest, so validate on entry: an instance
    // started by an older deploy must not run against a newer shape.
    const { invitationId } = invitationReminder.schema.parse(event.payload);

    // Step results must be JSON-serializable, hence the timestamp number.
    const invitation = await step.do('load invitation', async () => {
      const db = await database();
      const row = await db.query.invitation.findFirst({
        where: eq(schema.invitation.id, invitationId),
      });
      if (row === undefined) {
        return null;
      }
      return { expiresAt: row.expiresAt.getTime() };
    });
    if (invitation === null) {
      return;
    }

    // A day before expiry; Better Auth's default invitation lifetime is 48h,
    // so this lands midway. sleepUntil with a past timestamp resolves
    // immediately, which keeps the step sequence deterministic on replay.
    await step.sleepUntil('wait until reminder is due', invitation.expiresAt - dayMs);

    await step.do('send reminder if still pending', async () => {
      const db = await database();
      const row = await db.query.invitation.findFirst({
        where: eq(schema.invitation.id, invitationId),
      });
      if (row === undefined || row.status !== 'pending' || row.expiresAt.getTime() <= Date.now()) {
        return;
      }

      const inviter = await db.query.user.findFirst({
        where: eq(schema.user.id, row.inviterId),
      });
      const organization = await db.query.organization.findFirst({
        where: eq(schema.organization.id, row.organizationId),
      });
      if (inviter === undefined || organization === undefined) {
        return;
      }

      const mailer = createMailer({
        apiKey: this.env.RESEND_API_KEY,
        from: this.env.MAIL_FROM,
      });
      await mailer.sendInvitationReminder({
        to: row.email,
        inviterName: inviter.name,
        organizationName: organization.name,
        inviteLink: `${this.env.BETTER_AUTH_URL}/invite/${invitationId}`,
        // One click terminates this workflow chain, so later reminder steps
        // never run for this invitation.
        unsubscribeUrl: await unsubscribeUrl(
          this.env.BETTER_AUTH_URL,
          this.env.BETTER_AUTH_SECRET,
          {
            kind: 'invitation-reminders',
            id: invitationId,
          },
        ),
      });
    });
  }
}
