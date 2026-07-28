import { createFileRoute } from '@tanstack/react-router';

import { AnalyticsDashboard } from '#/analytics/analytics-dashboard.tsrx';

export const Route = createFileRoute('/app/analytics')({
  component: AnalyticsDashboard,
});
