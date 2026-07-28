import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { onError, ORPCError } from '@orpc/server';

import { router } from '#/api/router';

const handler = new OpenAPIHandler(router, {
  interceptors: [
    // Contract-declared errors (401s and friends) are expected traffic; only
    // surface genuinely unexpected failures in the worker logs.
    onError((error) => {
      if (!(error instanceof ORPCError)) {
        console.error('Unexpected API error:', error);
      }
    }),
  ],
});

// Everything under /api/v1 is keyed to an organization, so shared caches must
// never hold it; health is the one public read and gets a short public TTL.
function cacheControl(request: Request): string {
  if (request.method === 'GET' && new URL(request.url).pathname === '/api/v1/health') {
    return 'public, max-age=60';
  }
  return 'no-store';
}

export async function handleApiRequest(request: Request): Promise<Response> {
  const { matched, response } = await handler.handle(request, {
    prefix: '/api/v1',
    context: { headers: request.headers },
  });

  if (matched) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', cacheControl(request));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
  return new Response('Not found.', { status: 404 });
}
