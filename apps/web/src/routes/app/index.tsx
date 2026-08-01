import { createFileRoute } from '@tanstack/react-router';

import { analyticsOverviewQuery } from '#/analytics/functions';
import { HomePage } from '#/home/home-page.tsrx';
import { recentEntriesQuery } from '#/home/functions';

export const Route = createFileRoute('/app/')({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(recentEntriesQuery(context.activeOrganization.id)),
      context.queryClient.ensureQueryData(analyticsOverviewQuery('7d')),
    ]);
  },
  component: HomePage,
});
