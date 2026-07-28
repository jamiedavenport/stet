import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';

import { ActionEmail } from './layout';

export type VerifyEmailProps = {
  locale: Locale;
  name: string;
  verifyLink: string;
};

export function VerifyEmail({ locale, name, verifyLink }: VerifyEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.verify_email_preview({ brandName })}
      heading={t.verify_your_email()}
      body={t.verify_email_body({ name, brandName })}
      action={{ href: verifyLink, label: t.verify_email() }}
      footer={t.verify_email_footer({ brandName })}
    />
  );
}
