import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';

import { ActionEmail } from './layout';

export type MagicLinkEmailProps = {
  locale: Locale;
  name: string;
  magicLink: string;
};

export function MagicLinkEmail({ locale, name, magicLink }: MagicLinkEmailProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.magic_link_preview({ brandName })}
      heading={t.magic_link_title()}
      body={t.magic_link_body({ name, brandName })}
      action={{ href: magicLink, label: t.magic_link_button() }}
      footer={t.magic_link_footer()}
    />
  );
}
