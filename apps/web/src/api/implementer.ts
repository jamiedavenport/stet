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

/**
 * The organization an `x-api-key` header is scoped to. Keys are
 * organization-owned, so the key's referenceId is an organization id.
 *
 * The error is thrown directly (not via the typed `errors` map) because both
 * middlewares below are shared across procedures, including ones that declare
 * no errors.
 */
async function organizationFromKey(headers: Headers): Promise<string> {
  const key = headers.get('x-api-key');
  if (key === null || key === '') {
    throw new ORPCError('UNAUTHORIZED', { message: authErrors.UNAUTHORIZED.message });
  }

  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || result.key === null) {
    throw new ORPCError('UNAUTHORIZED', { message: authErrors.UNAUTHORIZED.message });
  }
  return result.key.referenceId;
}

/**
 * Authenticates without spending the API request quota. Analytics uses this:
 * its traffic is one request per browser batch, which says nothing about how
 * much API a customer uses, and a quota that stopped it would surface as data
 * quietly going missing rather than as an error anyone could act on. Its
 * volume is bounded by INGEST_RATE_LIMIT instead (see #/security).
 */
export const keyed = os.middleware(async ({ context, next }) => {
  return next({ context: { organizationId: await organizationFromKey(context.headers) } });
});

/**
 * The default for the public API: authenticate, then spend one unit of the
 * organization's API request quota, atomically, before the handler runs.
 */
export const authenticated = os.middleware(async ({ context, next }) => {
  const organizationId = await organizationFromKey(context.headers);
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
