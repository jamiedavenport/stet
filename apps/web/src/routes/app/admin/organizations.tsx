import { createFileRoute } from '@tanstack/react-router';

import { AdminOrganizations } from '#/admin/admin-organizations.tsrx';
import { adminOrganizationsQuery } from '#/admin/functions';

export const Route = createFileRoute('/app/admin/organizations')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminOrganizationsQuery({ search: '', page: 0 })),
  component: AdminOrganizations,
});
