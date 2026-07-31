import { brand } from '@repo/brand';

import { ActionEmail } from './layout';

export type ChangeEmailProps = {
  name: string;
  newEmail: string;
  confirmLink: string;
};

export function ChangeEmail({ name, newEmail, confirmLink }: ChangeEmailProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`Confirm the email change for your ${brandName} account`}
      heading={'Confirm your email change'}
      body={`Hi ${name}, we received a request to change the email on your ${brandName} account to ${newEmail}. Confirm below to make the change. The link expires in one hour.`}
      action={{ href: confirmLink, label: 'Confirm change' }}
      footer={
        "If you didn't request this change, you can ignore this email and your email address won't change."
      }
    />
  );
}
