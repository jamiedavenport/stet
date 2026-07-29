import { Outlet, createFileRoute, notFound } from '@tanstack/react-router';

import { AdminNav } from '#/admin/admin-nav.tsrx';
import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';
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
  useBreadcrumbs([{ label: 'Admin' }]);
  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title={'Admin'} description={'Everyone and everything on this deployment.'} />
      <AdminNav />
      <Outlet />
    </div>
  );
}
