import { canManageOrganization } from '@repo/auth/access';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { DangerZone } from '#/developers/danger-zone.tsrx';
import { deprecationsQuery } from '#/developers/deprecations';

export const Route = createFileRoute('/app/developers/danger')({
  // Organization configuration, so it matches the guards beside it.
  beforeLoad: ({ context }) => {
    if (!canManageOrganization(context.memberRole)) {
      throw notFound();
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(deprecationsQuery(context.activeOrganization.id)),
  component: DangerZone,
});
