import { createFileRoute } from '@tanstack/react-router';

import { handleApiRequest } from '#/api/handler';
import { enforceApiRateLimit } from '#/security';

async function handle(request: Request): Promise<Response> {
  const limited = await enforceApiRateLimit(request);
  if (limited !== null) {
    return limited;
  }
  return handleApiRequest(request);
}

export const Route = createFileRoute('/api/v1/$')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
      PUT: ({ request }) => handle(request),
      PATCH: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
