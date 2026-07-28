import { createFileRoute } from '@tanstack/react-router';

import { AdminUsers } from '#/admin/admin-users.tsrx';
import { adminUsersQuery } from '#/admin/functions';

export const Route = createFileRoute('/app/admin/users')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminUsersQuery({ search: '', page: 0 })),
  component: AdminUsers,
});
