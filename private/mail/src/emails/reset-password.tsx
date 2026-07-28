import { brand } from '@repo/brand';

import { ActionEmail } from './layout';

export type ResetPasswordEmailProps = {
  name: string;
  resetLink: string;
};

export function ResetPasswordEmail({ name, resetLink }: ResetPasswordEmailProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`Reset your ${brandName} password`}
      heading={'Reset your password'}
      body={`Hi ${name}, we received a request to reset the password for your ${brandName} account. The link below expires in one hour.`}
      action={{ href: resetLink, label: 'Reset password' }}
      footer={
        "If you didn't request a password reset, you can ignore this email. Your password won't change."
      }
    />
  );
}
