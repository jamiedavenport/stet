import { createFileRoute } from '@tanstack/react-router';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';

export const Route = createFileRoute('/app/')({
  component: Home,
});

function Home() {
  useBreadcrumbs([{ label: 'Home' }]);
  const { session, activeOrganization } = Route.useRouteContext();
  const email = session.user.email;
  const organizationName = activeOrganization.name;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={'Welcome back'}
        description={`Signed in as ${email} in ${organizationName}.`}
      />
      <p className="max-w-md text-sm text-pretty text-muted-foreground">
        {'Open a collection from the sidebar, or press ⌘K to jump to anything.'}
      </p>
    </div>
  );
}
