import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';

import { ActionEmail } from './layout';

export type WelcomeEmailProps = {
  locale: Locale;
  name: string;
  appLink: string;
};

export function WelcomeEmail({ locale, name, appLink }: WelcomeEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.welcome_preview({ brandName, name })}
      heading={t.welcome_to_brand({ brandName })}
      body={t.welcome_body({ name })}
      action={{ href: appLink, label: t.open_brand({ brandName }) }}
      footer={t.welcome_footer()}
    />
  );
}
