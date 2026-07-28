import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';
import { Link } from '@react-email/components';

import { ActionEmail, emailLinkStyle } from './layout';

export type InvitationReminderEmailProps = {
  locale: Locale;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  unsubscribeUrl: string;
};

export function InvitationReminderEmail({
  locale,
  inviterName,
  organizationName,
  inviteLink,
  unsubscribeUrl,
}: InvitationReminderEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.invitation_reminder_preview({ inviterName, organizationName, brandName })}
      heading={t.invitation_reminder_title({ organizationName })}
      body={t.invitation_reminder_body({ inviterName, organizationName })}
      action={{ href: inviteLink, label: t.accept_invitation() }}
      footer={t.invitation_footer()}
      footerLinks={
        <Link href={unsubscribeUrl} style={emailLinkStyle}>
          {t.stop_invitation_reminders()}
        </Link>
      }
    />
  );
}
