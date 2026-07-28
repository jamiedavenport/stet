import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';

import { ActionEmail } from './layout';

export type ResetPasswordEmailProps = {
  locale: Locale;
  name: string;
  resetLink: string;
};

export function ResetPasswordEmail({ locale, name, resetLink }: ResetPasswordEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.reset_password_subject({ brandName })}
      heading={t.reset_your_password()}
      body={t.reset_password_body({ name, brandName })}
      action={{ href: resetLink, label: t.reset_password() }}
      footer={t.reset_password_footer()}
    />
  );
}
