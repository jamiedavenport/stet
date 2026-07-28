import { brand } from '@repo/brand';
import type { Locale } from '@repo/i18n';
import { localized } from '@repo/i18n/localized';

import { ActionEmail } from './layout';

export type DeleteAccountProps = {
  locale: Locale;
  name: string;
  deleteLink: string;
};

export function DeleteAccountEmail({ locale, name, deleteLink }: DeleteAccountProps) {
  const t = localized(locale);
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={t.delete_account_preview({ brandName })}
      heading={t.delete_your_account()}
      body={t.delete_account_body({ name, brandName })}
      action={{ href: deleteLink, label: t.confirm_deletion(), danger: true }}
      footer={t.delete_account_footer()}
    />
  );
}
