import { brand } from '@repo/brand';

import { ActionEmail } from './layout';

export type DeleteAccountProps = {
  name: string;
  deleteLink: string;
};

export function DeleteAccountEmail({ name, deleteLink }: DeleteAccountProps) {
  const brandName = brand.name;
  return (
    <ActionEmail
      preview={`Confirm deleting your ${brandName} account`}
      heading={'Delete your account'}
      body={`Hi ${name}, we received a request to permanently delete your ${brandName} account. This can't be undone. Confirm below to delete it. The link expires in one hour.`}
      action={{ href: deleteLink, label: 'Delete account', danger: true }}
      footer={
        "If you didn't request this, you can ignore this email and your account will stay active."
      }
    />
  );
}
