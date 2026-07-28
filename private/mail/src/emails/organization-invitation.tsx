import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';

import { ActionEmail } from './layout';

export type OrganizationInvitationEmailProps = {
  locale: Locale;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
};

export function OrganizationInvitationEmail({
  locale,
  inviterName,
  organizationName,
  inviteLink,
}: OrganizationInvitationEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.invitation_preview({ inviterName, organizationName, brandName })}
      heading={t.join_org_on_brand({ organizationName, brandName })}
      body={t.invitation_body({ inviterName, organizationName })}
      action={{ href: inviteLink, label: t.accept_invitation() }}
      footer={t.invitation_footer()}
    />
  );
}
