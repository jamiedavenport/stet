import { brand } from '@repo/brand';

import { ActionEmail } from './layout';

export type VerifyEmailProps = {
  name: string;
  verifyLink: string;
};

export function VerifyEmail({ name, verifyLink }: VerifyEmailProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`Verify your email address for ${brandName}`}
      heading={'Verify your email'}
      body={`Hi ${name}, confirm this is your email address to finish setting up your ${brandName} account. The link below expires in one hour.`}
      action={{ href: verifyLink, label: 'Verify email' }}
      footer={`If you didn't create an ${brandName} account, you can ignore this email.`}
    />
  );
}
