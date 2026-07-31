import { brand } from '@repo/brand';

import { ActionEmail } from './layout';

export type OrganizationInvitationEmailProps = {
  inviterName: string;
  organizationName: string;
  inviteLink: string;
};

export function OrganizationInvitationEmail({
  inviterName,
  organizationName,
  inviteLink,
}: OrganizationInvitationEmailProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`${inviterName} invited you to join ${organizationName} on ${brandName}`}
      heading={`Join ${organizationName} on ${brandName}`}
      body={`${inviterName} has invited you to collaborate in the ${organizationName} organization.`}
      action={{ href: inviteLink, label: 'Accept invitation' }}
      footer={"If you weren't expecting this invitation, you can ignore this email."}
    />
  );
}
