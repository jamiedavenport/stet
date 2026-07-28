import { createFileRoute } from '@tanstack/react-router';

import { fullOrganizationQuery, orgBillingQuery } from '#/organization/functions';
import { OrganizationSettings } from '#/organization/organization-settings.tsrx';

export const Route = createFileRoute('/app/organization')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(fullOrganizationQuery(context.activeOrganization.id)),
      context.queryClient.ensureQueryData(orgBillingQuery(context.activeOrganization.id)),
    ]);
  },
  component: OrganizationSettings,
});
