import { brand } from '@repo/brand';
import { Link } from '@react-email/components';

import { ActionEmail, emailLinkStyle } from './layout';

export type InvitationReminderEmailProps = {
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  unsubscribeUrl: string;
};

export function InvitationReminderEmail({
  inviterName,
  organizationName,
  inviteLink,
  unsubscribeUrl,
}: InvitationReminderEmailProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`Reminder: ${inviterName} invited you to join ${organizationName} on ${brandName}`}
      heading={`Your invitation to ${organizationName} is waiting`}
      body={`${inviterName} invited you to collaborate in the ${organizationName} organization. The invitation expires soon, so accept it while it's still valid.`}
      action={{ href: inviteLink, label: 'Accept invitation' }}
      footer={"If you weren't expecting this invitation, you can ignore this email."}
      footerLinks={
        <Link href={unsubscribeUrl} style={emailLinkStyle}>
          {'Stop reminders about this invitation'}
        </Link>
      }
    />
  );
}
