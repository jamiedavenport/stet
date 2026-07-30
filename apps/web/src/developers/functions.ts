import { and, database, eq, schema } from '@repo/db';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { auth } from '#/auth-server';
import { organizationAdminMiddleware } from '#/session';

/** Better Auth's `maximumNameLength` for an API key, so the form says so first. */
export const maxKeyNameLength = 32;

// Keys are stored hashed, so a listing can only ever show the opening
// characters the plugin keeps beside them; the key itself exists once, in the
// create response.
const getApiKeys = createServerFn({ method: 'GET' })
  .middleware([organizationAdminMiddleware])
  .handler(async ({ context }) => {
    const { apiKeys } = await auth.api.listApiKeys({
      headers: context.headers,
      query: { organizationId: context.organizationId },
    });
    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      start: key.start,
      createdAt: key.createdAt,
      lastRequest: key.lastRequest,
    }));
  });

export type ApiKeysData = Awaited<ReturnType<typeof getApiKeys>>;

export const createApiKey = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ name: z.string().min(1).max(maxKeyNameLength) }))
  .handler(async ({ data, context }) => {
    const created = await auth.api.createApiKey({
      headers: context.headers,
      body: { name: data.name, organizationId: context.organizationId },
    });
    return { key: created.key };
  });

export const revokeApiKey = createServerFn({ method: 'POST' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    // The plugin authorizes against whichever organization owns the key, which
    // would let an admin of two organizations revoke the other one's key from
    // here. Scope the lookup to the active organization first.
    const db = await database();
    const key = await db.query.apikey.findFirst({
      where: and(
        eq(schema.apikey.id, data.id),
        eq(schema.apikey.referenceId, context.organizationId),
      ),
    });
    if (key === undefined) {
      throw new Error('API key not found');
    }
    await auth.api.deleteApiKey({ headers: context.headers, body: { keyId: key.id } });
  });

export const apiKeysQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['api-keys', organizationId],
    queryFn: () => getApiKeys(),
    staleTime: 30_000,
  });
