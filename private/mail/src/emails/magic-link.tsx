import { brand } from '@repo/brand';

import { ActionEmail } from './layout';

export type MagicLinkEmailProps = {
  name: string;
  magicLink: string;
};

export function MagicLinkEmail({ name, magicLink }: MagicLinkEmailProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`Your sign-in link for ${brandName}`}
      heading={'Your sign-in link'}
      body={`Hi ${name}, click below to sign in to your ${brandName} account. The link expires in five minutes and can be used once.`}
      action={{ href: magicLink, label: 'Sign in' }}
      footer={"If you didn't request this link, you can ignore this email."}
    />
  );
}
