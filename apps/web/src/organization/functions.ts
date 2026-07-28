import { canManageOrganization } from '@repo/auth/access';
import { ai, catalog, getSubscription, toPlanName, usageReport } from '@repo/billing/server';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';

import { auth } from '#/auth-server';
import { authenticatedMiddleware, organizationMiddleware } from '#/session';

// The active organization with its members and invitations, wrapped by
// fullOrganizationQuery below; refresh with `router.invalidate()`.
const getFullOrganization = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const organization = await auth.api.getFullOrganization({ headers: context.headers });
    // The middleware guarantees an active id, so null means the row is gone.
    if (organization === null) {
      throw new Error('Organization not found');
    }
    return organization;
  });

export type FullOrganization = Awaited<ReturnType<typeof getFullOrganization>>;

// Keyed by organization so switching orgs never serves another org's roster
// from the cache. The short staleTime keeps hover-preloads cheap while still
// picking up changes made by other members.
export const fullOrganizationQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['full-organization', organizationId],
    queryFn: () => getFullOrganization(),
    staleTime: 30_000,
  });

// A single invitation, or null when it is invalid, expired, or addressed to
// another email. Loaded by the invite route.
export const getInvitation = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id, context }) => {
    try {
      return await auth.api.getInvitation({ headers: context.headers, query: { id } });
    } catch {
      return null;
    }
  });

// The active organization's billing state: plan, feature flags, the usage
// report, the plan catalog, and the subscription summary the billing page
// renders. Everything the client needs, resolved server-side because the
// catalog's feature definitions close over database queries.
const getOrgBilling = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const organizationId = context.organizationId;
    const subscription = await getSubscription(organizationId);
    const [aiEnabled, usage] = await Promise.all([
      ai.can(organizationId),
      usageReport(organizationId, subscription),
    ]);
    return {
      plan: toPlanName(subscription?.plan),
      features: { ai: aiEnabled },
      usage,
      catalog,
      canManage: canManageOrganization(context.role),
      subscription:
        subscription === null
          ? null
          : {
              status: subscription.status,
              seats: subscription.seats,
              periodEnd: subscription.periodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
            },
    };
  });

// Keyed by organization so switching orgs never shows another org's plan.
export const orgBillingQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['org-billing', organizationId],
    queryFn: () => getOrgBilling(),
    staleTime: 30_000,
  });
