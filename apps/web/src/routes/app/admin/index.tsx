import { createFileRoute } from '@tanstack/react-router';

import { PlatformStats } from '#/admin/platform-stats.tsrx';
import { platformStatsQuery } from '#/admin/functions';

export const Route = createFileRoute('/app/admin/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(platformStatsQuery),
  component: PlatformStats,
});
