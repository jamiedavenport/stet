import { entitlementIn, planByName, usedOf } from './entitlements';
import { features, plans } from './plans';
import { getSubscription } from './subscription';
import type { OrgSubscription } from './subscription';
import type { Usage } from './types';

export { BillingError } from './error';
export { ai, apiRequests, catalog, megabyte, members, storage, toPlanName } from './plans';
export { getSubscription };

/** Every measured feature the organization's plan includes, with current
 * usage. Feeds the billing settings page and GET /org/billing. Callers that
 * already hold the subscription row pass it to skip refetching it. */
export async function usageReport(
  organizationId: string,
  subscription?: OrgSubscription | null,
): Promise<Usage[]> {
  const row = subscription === undefined ? await getSubscription(organizationId) : subscription;
  const plan = planByName(plans, row?.plan);
  const rows = await Promise.all(
    features.map(async (feature) => {
      if (feature.kind === 'flag') {
        return null;
      }
      const terms = entitlementIn(plan, feature.name);
      if (terms.kind === 'excluded') {
        return null;
      }
      return {
        feature: feature.name,
        used: await usedOf(organizationId, feature),
        cap: terms.cap,
        window: feature.window,
      };
    }),
  );
  return rows.filter((row) => row !== null);
}
