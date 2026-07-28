import { canManageOrganization } from '@repo/auth/access';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { ApiKeys } from '#/developers/api-keys.tsrx';

export const Route = createFileRoute('/app/developers/keys')({
  // Organization configuration, so it matches the webhook guard beside it.
  beforeLoad: ({ context }) => {
    if (!canManageOrganization(context.memberRole)) {
      throw notFound();
    }
  },
  component: ApiKeys,
});
