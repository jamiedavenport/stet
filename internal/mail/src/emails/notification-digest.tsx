import { brand } from '@repo/brand';
import { Link } from '@react-email/components';

import { ActionEmail, EmailText, emailLinkStyle, palette } from './layout';

export type NotificationDigestItem = {
  title: string;
  href: string | null;
};

export type NotificationDigestEmailProps = {
  organizationName: string;
  items: NotificationDigestItem[];
  appLink: string;
  unsubscribeUrl: string;
};

export function NotificationDigestEmail({
  organizationName,
  items,
  appLink,
  unsubscribeUrl,
}: NotificationDigestEmailProps) {
  const brandName = brand.name;
  // The count line only renders for two or more items, so it needs no
  // singular form.
  const heading =
    items.length === 1
      ? `New in ${organizationName}`
      : `${items.length} new notifications in ${organizationName}`;

  return (
    <ActionEmail
      preview={items[0]?.title ?? heading}
      heading={heading}
      action={{ href: appLink, label: `Open ${brandName}` }}
      footer={'You can turn these emails off in your notification settings.'}
      tightBottom
      footerLinks={
        <>
          <Link href={unsubscribeUrl} style={emailLinkStyle}>
            {'Turn off notification emails'}
          </Link>
          {' · '}
          <Link href={`${appLink}/app/settings`} style={emailLinkStyle}>
            {'Manage notification settings'}
          </Link>
        </>
      }
    >
      {items.map((item, index) => (
        <EmailText key={index} style={{ margin: '0 0 8px' }}>
          {item.href === null ? (
            item.title
          ) : (
            <Link href={`${appLink}${item.href}`} style={{ color: palette.heading }}>
              {item.title}
            </Link>
          )}
        </EmailText>
      ))}
    </ActionEmail>
  );
}
