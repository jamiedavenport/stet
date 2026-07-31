import { brand } from '@repo/brand';

import { ActionEmail } from './layout';

export type WelcomeEmailProps = {
  name: string;
  appLink: string;
};

export function WelcomeEmail({ name, appLink }: WelcomeEmailProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`Welcome to ${brandName}, ${name}`}
      heading={`Welcome to ${brandName}`}
      body={`Hi ${name}, your account is ready. Create an organization, invite your team, and start collaborating on tasks and notes in real time.`}
      action={{ href: appLink, label: `Open ${brandName}` }}
      footer={"If you didn't create this account, you can ignore this email."}
    />
  );
}
