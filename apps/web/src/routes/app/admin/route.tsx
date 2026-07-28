import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';

import { AdminNav } from '#/admin/admin-nav.tsrx';
import { isPlatformAdmin } from '#/session';

export const Route = createFileRoute('/app/admin')({
  // A 404 rather than a redirect: the panel should not advertise itself to
  // accounts that cannot use it. The server functions guard themselves.
  beforeLoad: ({ context }) => {
    if (!isPlatformAdmin(context.session.user)) {
      throw notFound();
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <AdminNav />
      <Outlet />
    </div>
  );
}
