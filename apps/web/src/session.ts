import { canManageOrganization } from '@repo/auth/access';
import type { OrganizationRole } from '@repo/auth/access';
import { and, database, eq, schema } from '@repo/db';
import { cookieMaxAge, cookieName, isLocale } from '@repo/i18n';
import { queryOptions } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { notFound, redirect } from '@tanstack/react-router';
import { createMiddleware, createServerFn } from '@tanstack/react-start';
import { getRequestHeaders, setCookie } from '@tanstack/react-start/server';

import { auth } from '#/auth-server';
import { requireActiveOrganization } from '#/organization/membership';

/**
 * Whether a user is platform staff: `role` is the admin plugin's
 * platform-wide role, unrelated to a member's role within an organization.
 */
export function isPlatformAdmin(user: { role?: string | null }): boolean {
  return user.role === 'admin';
}

// Resolves the Better Auth session once per server-function call and puts it
// (plus the request headers) on context for downstream handlers.
const sessionMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });
  return next({ context: { session, headers } });
});

// For server functions that require a signed-in user. Narrows
// `context.session` to non-null; bounces to sign-in otherwise.
export const authenticatedMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    if (context.session === null) {
      throw redirect({ to: '/sign/in' });
    }
    return next({ context: { session: context.session } });
  });

// For server functions that only platform staff may call. Mirrors the route
// guard on /app/admin, because a route guard alone leaves the function
// callable directly.
export const adminMiddleware = createMiddleware({ type: 'function' })
  .middleware([authenticatedMiddleware])
  .server(async ({ next, context }) => {
    if (!isPlatformAdmin(context.session.user)) {
      throw notFound();
    }
    return next({ context });
  });

// For server functions that operate on the active organization. Puts
// `organizationId` and the caller's `role` on context.
export const organizationMiddleware = createMiddleware({ type: 'function' })
  .middleware([authenticatedMiddleware])
  .server(async ({ next, context }) => {
    return next({ context: await requireActiveOrganization(context.session) });
  });

// For server functions that change organization configuration (webhooks and
// friends). notFound mirrors adminMiddleware: the surface simply does not
// exist for plain members.
export const organizationAdminMiddleware = createMiddleware({ type: 'function' })
  .middleware([organizationMiddleware])
  .server(async ({ next, context }) => {
    if (!canManageOrganization(context.role)) {
      throw notFound();
    }
    return next({ context });
  });

// Served from Better Auth's cookie cache (session.cookieCache in
// private/auth/src/server.ts), not a D1 query, so root can run it per-request.
const getSession = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler(({ context }) => {
    // Mirror the account's locale preference into the Paraglide cookie so the
    // choice follows the account across devices and survives sign-out.
    // Unconditional: the request cookie may be the preference the server
    // entry injected for a cookie-less request, and the browser needs the
    // real Set-Cookie before hydration resolves (and pins) its own locale.
    const stored = context.session?.user.locale;
    if (isLocale(stored)) {
      setCookie(cookieName, stored, { path: '/', maxAge: cookieMaxAge });
    }
    return context.session;
  });

export type Session = Awaited<ReturnType<typeof getSession>>;

const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: () => getSession(),
  staleTime: Infinity,
});

export const ensureSession = (queryClient: QueryClient) =>
  queryClient.ensureQueryData(sessionQuery);

// The caller's role in the given organization, for nav and route guards.
// Takes the organization id as input (verified against the caller's own user
// id, so it can only reveal their own membership) rather than reading the
// session's active id: during an SSR heal the request cookie still carries
// the previous organization.
const getActiveMember = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator((organizationId: string) => organizationId)
  .handler(async ({ data, context }) => {
    const db = await database();
    const membership = await db.query.member.findFirst({
      where: and(
        eq(schema.member.organizationId, data),
        eq(schema.member.userId, context.session.user.id),
      ),
    });
    if (membership === undefined) {
      throw notFound();
    }
    return { role: membership.role as OrganizationRole };
  });

// Keyed by organization so an org switch never serves the previous org's
// role from the cache.
const activeMemberQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['active-member', organizationId],
    queryFn: () => getActiveMember({ data: organizationId }),
    staleTime: 30_000,
  });

export const ensureActiveMember = (queryClient: QueryClient, organizationId: string) =>
  queryClient.ensureQueryData(activeMemberQuery(organizationId));

// Heals a session whose active organization the user can no longer use
// (left, removed, or deleted): Better Auth verifies membership of the new
// organization and rewrites the session cookie.
export const setActiveOrganization = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator((organizationId: string) => organizationId)
  .handler(async ({ data, context }) => {
    await auth.api.setActiveOrganization({
      headers: context.headers,
      body: { organizationId: data },
    });
  });

// A D1 query (unlike `getSession`), so only routes that need the list call it.
const getOrganizations = createServerFn({ method: 'GET' })
  .middleware([sessionMiddleware])
  .handler(({ context }) => {
    if (context.session === null) {
      throw redirect({ to: '/sign/in' });
    }
    return auth.api.listOrganizations({ headers: context.headers });
  });

const organizationsQuery = queryOptions({
  queryKey: ['organizations'],
  queryFn: () => getOrganizations(),
  staleTime: Infinity,
});

export const ensureOrganizations = (queryClient: QueryClient) =>
  queryClient.ensureQueryData(organizationsQuery);

// Drop the caches after an auth or org mutation so the next read (a
// navigation or `router.invalidate()`) refetches them.
export function clearSessionContext(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: sessionQuery.queryKey });
  queryClient.removeQueries({ queryKey: organizationsQuery.queryKey });
  queryClient.removeQueries({ queryKey: ['active-member'] });
}

// Route guard for beforeLoad: bounces signed-out users to sign-in, carrying
// the current location so they return here after authenticating.
export function requireSession(
  session: Session,
  location: { href: string },
): asserts session is NonNullable<Session> {
  if (session === null) {
    throw redirect({ to: '/sign/in', search: { redirect: location.href } });
  }
}
