import type { ReactElement } from 'react';
import { brand } from '@repo/brand';
import { Resend } from 'resend';

import { ChangeEmail } from './emails/change-email';
import { DeleteAccountEmail } from './emails/delete-account';
import { InvitationReminderEmail } from './emails/invitation-reminder';
import { MagicLinkEmail } from './emails/magic-link';
import { NotificationDigestEmail } from './emails/notification-digest';
import type { NotificationDigestItem } from './emails/notification-digest';
import { OrganizationInvitationEmail } from './emails/organization-invitation';
import { ResetPasswordEmail } from './emails/reset-password';
import { VerifyEmail } from './emails/verify-email';
import { WelcomeEmail } from './emails/welcome';

export type { NotificationDigestItem };

export type CreateMailerOptions = {
  // When omitted (e.g. local dev without the secret), emails are logged
  // instead of sent so flows depending on mail still work.
  apiKey?: string;
  // Sender address, e.g. 'Stet <hello@yourdomain.com>'. Deployment config —
  // the domain must be verified with Resend.
  from: string;
};

export type SendOrganizationInvitationOptions = {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
};

export type SendWelcomeEmailOptions = {
  to: string;
  name: string;
  appLink: string;
};

export type SendInvitationReminderOptions = {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  // Required on bulk email: becomes the List-Unsubscribe headers and the
  // footer link. Stops the remaining reminders for this invitation.
  unsubscribeUrl: string;
};

export type SendMagicLinkOptions = {
  to: string;
  name: string;
  magicLink: string;
};

export type SendResetPasswordOptions = {
  to: string;
  name: string;
  resetLink: string;
};

export type SendVerificationEmailOptions = {
  to: string;
  name: string;
  verifyLink: string;
};

export type SendChangeEmailOptions = {
  to: string;
  name: string;
  newEmail: string;
  confirmLink: string;
};

export type SendDeleteAccountOptions = {
  to: string;
  name: string;
  deleteLink: string;
};

export type SendNotificationDigestOptions = {
  to: string;
  // Null when the organization no longer exists; the email falls back to a
  // generic phrase.
  organizationName: string | null;
  items: NotificationDigestItem[];
  appLink: string;
  // Required on bulk email: becomes the List-Unsubscribe headers and the
  // footer link. Turns off the recipient's notification emails.
  unsubscribeUrl: string;
};

export function createMailer({ apiKey, from }: CreateMailerOptions) {
  const resend = apiKey ? new Resend(apiKey) : null;
  const brandName = brand.name;

  async function deliver(options: {
    kind: string;
    to: string;
    subject: string;
    react: ReactElement;
    // Primary action URL of the email, echoed in the skip log so local dev
    // (no API key) can still complete link-based flows like password reset.
    link?: string;
    // One-click unsubscribe URL. Every bulk email (digests, reminders) must
    // carry one: it becomes the RFC 8058 List-Unsubscribe headers Gmail and
    // Yahoo require of bulk senders. Transactional email must not set it,
    // because suppressing verification or reset email would break auth.
    unsubscribe?: string;
  }): Promise<void> {
    if (resend === null) {
      const linkSuffix = options.link ? ` (${options.link})` : '';
      const unsubscribeSuffix = options.unsubscribe ? ` [unsubscribe: ${options.unsubscribe}]` : '';
      console.log(
        `[mail] RESEND_API_KEY not set, skipping ${options.kind} email to ${options.to}: ${options.subject}${linkSuffix}${unsubscribeSuffix}`,
      );
      return;
    }
    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      react: options.react,
      headers:
        options.unsubscribe === undefined
          ? undefined
          : {
              'List-Unsubscribe': `<${options.unsubscribe}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
    });
    if (error) throw new Error(`Failed to send ${options.kind} email: ${error.message}`);
  }

  return {
    async sendOrganizationInvitation(options: SendOrganizationInvitationOptions) {
      await deliver({
        kind: 'invitation',
        to: options.to,
        subject: `Join ${options.organizationName} on ${brandName}`,
        react: <OrganizationInvitationEmail {...options} />,
      });
    },
    async sendWelcomeEmail(options: SendWelcomeEmailOptions) {
      await deliver({
        kind: 'welcome',
        to: options.to,
        subject: `Welcome to ${brandName}`,
        react: <WelcomeEmail {...options} />,
      });
    },
    // One email per flush of a user's notification outbox (see the
    // NotificationHub in @repo/notifications), so a burst of activity lands
    // as a single digest instead of an email per event.
    async sendNotificationDigest(options: SendNotificationDigestOptions) {
      if (options.items.length === 0) {
        return;
      }
      const organizationLabel = options.organizationName ?? 'your organization';
      // With one item its stored title is the subject; the count line only
      // ever renders for two or more, so it needs no singular form.
      const subject =
        options.items.length === 1
          ? options.items[0].title
          : `${options.items.length} new notifications in ${organizationLabel}`;
      await deliver({
        kind: 'notification digest',
        to: options.to,
        subject,
        react: <NotificationDigestEmail {...options} organizationName={organizationLabel} />,
        unsubscribe: options.unsubscribeUrl,
      });
    },
    async sendInvitationReminder(options: SendInvitationReminderOptions) {
      await deliver({
        kind: 'invitation reminder',
        to: options.to,
        subject: `Reminder: join ${options.organizationName} on ${brandName}`,
        react: <InvitationReminderEmail {...options} />,
        unsubscribe: options.unsubscribeUrl,
      });
    },
    async sendMagicLink(options: SendMagicLinkOptions) {
      await deliver({
        kind: 'magic link',
        to: options.to,
        subject: `Sign in to ${brandName}`,
        react: <MagicLinkEmail {...options} />,
        link: options.magicLink,
      });
    },
    async sendResetPassword(options: SendResetPasswordOptions) {
      await deliver({
        kind: 'password reset',
        to: options.to,
        subject: `Reset your ${brandName} password`,
        react: <ResetPasswordEmail {...options} />,
        link: options.resetLink,
      });
    },
    async sendVerificationEmail(options: SendVerificationEmailOptions) {
      await deliver({
        kind: 'email verification',
        to: options.to,
        subject: `Verify your email for ${brandName}`,
        react: <VerifyEmail {...options} />,
        link: options.verifyLink,
      });
    },
    async sendChangeEmail(options: SendChangeEmailOptions) {
      await deliver({
        kind: 'email change',
        to: options.to,
        subject: `Confirm your ${brandName} email change`,
        react: <ChangeEmail {...options} />,
        link: options.confirmLink,
      });
    },
    async sendDeleteAccount(options: SendDeleteAccountOptions) {
      await deliver({
        kind: 'account deletion',
        to: options.to,
        subject: `Confirm deleting your ${brandName} account`,
        react: <DeleteAccountEmail {...options} />,
        link: options.deleteLink,
      });
    },
  };
}

export type Mailer = ReturnType<typeof createMailer>;
