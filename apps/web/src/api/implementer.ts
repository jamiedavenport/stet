import { authErrors, contract } from '@repo/api';
import { apiRequests, BillingError } from '@repo/billing/server';
import { implement, ORPCError } from '@orpc/server';

import { auth } from '#/auth-server';

// The worker hands the raw request headers to every procedure so auth can
// verify the caller's API key. Procedures reach the database through
// `database()` from @repo/db rather than receiving one here.
export type ApiContext = {
  headers: Headers;
};

export const os = implement(contract).$context<ApiContext>();

// Verifies the `x-api-key` header and narrows context to the organization the
// key is scoped to (keys are organization-owned, so the key's referenceId is
// an organization id). The error is thrown directly (not via the typed
// `errors` map) because this middleware is shared across procedures,
// including ones that declare no errors.
export const authenticated = os.middleware(async ({ context, next }) => {
  const key = context.headers.get('x-api-key');
  if (key === null || key === '') {
    throw new ORPCError('UNAUTHORIZED', {
      message: authErrors.UNAUTHORIZED.message,
    });
  }

  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || result.key === null) {
    throw new ORPCError('UNAUTHORIZED', {
      message: authErrors.UNAUTHORIZED.message,
    });
  }

  // Every authenticated request consumes one unit of the organization's API
  // request quota, atomically, before the handler runs.
  const organizationId = result.key.referenceId;
  try {
    await apiRequests.consume(organizationId);
  } catch (error) {
    if (error instanceof BillingError) {
      throw new ORPCError('QUOTA_EXCEEDED', authErrors.QUOTA_EXCEEDED);
    }
    throw error;
  }

  return next({ context: { organizationId } });
});
