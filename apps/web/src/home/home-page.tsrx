import { useSuspenseQuery } from '@tanstack/react-query';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';
import { contentModelQuery } from '#/content/model/functions';
import { AnalyticsSnapshot } from '#/home/analytics-snapshot.tsrx';
import { recentEntriesQuery } from '#/home/functions';
import { QuickActions } from '#/home/quick-actions.tsrx';
import { RecentEntries } from '#/home/recent-entries.tsrx';
import { useAppRoute } from '#/use-app-route';

/** The landing page of the app: recent work, a traffic pulse, and quick starts. */
export function HomePage() @{
  useBreadcrumbs([{ label: 'Home' }]);
  const { session, activeOrganization } = useAppRoute();
  const { data: entries } = useSuspenseQuery(recentEntriesQuery(activeOrganization.id));
  const { data: model } = useSuspenseQuery(contentModelQuery(activeOrganization.id));

  <div className="flex w-full flex-col gap-6">
    <PageHeader
      title={"Welcome back"}
      description={`Signed in as ${session.user.email} in ${activeOrganization.name}.`}
    />
    <QuickActions />
    <RecentEntries entries={entries} hasTypes={model.types.length > 0} />
    <AnalyticsSnapshot />
  </div>
}
