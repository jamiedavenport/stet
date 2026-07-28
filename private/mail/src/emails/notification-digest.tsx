import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';
import { Link } from '@react-email/components';

import { ActionEmail, EmailText, emailLinkStyle, palette } from './layout';

export type NotificationDigestItem = {
  title: string;
  href: string | null;
};

export type NotificationDigestEmailProps = {
  locale: Locale;
  organizationName: string;
  items: NotificationDigestItem[];
  appLink: string;
  unsubscribeUrl: string;
};

export function NotificationDigestEmail({
  locale,
  organizationName,
  items,
  appLink,
  unsubscribeUrl,
}: NotificationDigestEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  // The count line only renders for two or more items, so it needs no
  // singular form.
  const heading =
    items.length === 1
      ? t.new_in_org({ organizationName })
      : t.new_notifications_in_org({ count: items.length, organizationName });

  return (
    <ActionEmail
      preview={items[0]?.title ?? heading}
      heading={heading}
      action={{ href: appLink, label: t.open_brand({ brandName }) }}
      footer={t.digest_footer()}
      tightBottom
      footerLinks={
        <>
          <Link href={unsubscribeUrl} style={emailLinkStyle}>
            {t.turn_off_notification_emails()}
          </Link>
          {' · '}
          <Link href={`${appLink}/app/settings`} style={emailLinkStyle}>
            {t.manage_notification_settings()}
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
