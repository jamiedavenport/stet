import { createFileRoute } from '@tanstack/react-router';

import { AccountSettings } from '#/account/account-settings.tsrx';
import { notificationPreferencesQuery } from '#/notifications/functions';

export const Route = createFileRoute('/app/settings')({
  loader: ({ context }) => context.queryClient.ensureQueryData(notificationPreferencesQuery),
  component: AccountSettings,
});
