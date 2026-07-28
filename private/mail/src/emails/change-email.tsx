import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';

import { ActionEmail } from './layout';

export type ChangeEmailProps = {
  locale: Locale;
  name: string;
  newEmail: string;
  confirmLink: string;
};

export function ChangeEmail({ locale, name, newEmail, confirmLink }: ChangeEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.change_email_preview({ brandName })}
      heading={t.confirm_email_change()}
      body={t.change_email_body({ name, newEmail, brandName })}
      action={{ href: confirmLink, label: t.confirm_change() }}
      footer={t.change_email_footer()}
    />
  );
}
