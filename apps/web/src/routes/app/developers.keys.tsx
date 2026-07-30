import { canManageOrganization } from '@repo/auth/access';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { ApiKeys } from '#/developers/api-keys.tsrx';
import { apiKeysQuery } from '#/developers/functions';

export const Route = createFileRoute('/app/developers/keys')({
  // Organization configuration, so it matches the webhook guard beside it.
  beforeLoad: ({ context }) => {
    if (!canManageOrganization(context.memberRole)) {
      throw notFound();
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(apiKeysQuery(context.activeOrganization.id)),
  component: ApiKeys,
});
