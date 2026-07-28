import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';

// Server fn so the Workers-only `cloudflare:workers` import stays out of the
// client bundle. `.dev.vars` can override the id to "" (quiet local dev).
const getAnalyticsClientId = createServerFn({ method: 'GET' }).handler(() => {
  const clientId: string = env.OPENPANEL_CLIENT_ID;
  return clientId === '' ? null : clientId;
});

const analyticsClientIdQuery = queryOptions({
  queryKey: ['analytics-client-id'],
  queryFn: () => getAnalyticsClientId(),
  staleTime: Infinity,
});

export function ensureAnalyticsClientId(queryClient: QueryClient): Promise<string | null> {
  return queryClient.ensureQueryData(analyticsClientIdQuery);
}
