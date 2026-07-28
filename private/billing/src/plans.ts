import { and, database, eq, inArray, schema, sql } from '@repo/db';

import { createFeatures, definePlan } from './define';
import { planByName } from './entitlements';
import type { FeatureName, PlanName, PlanSummary } from './types';

// The guards resolve plans through this getter rather than importing them,
// which is what keeps this module the sole owner of the catalog.
const defineFeature = createFeatures(() => plans);

/** The AI assistant (the chat agent and its worker route). */
export const ai = defineFeature({ name: 'ai', label: 'AI assistant' });

/** Organization members. Usage counts current members plus pending
 * invitations, so outstanding invites cannot over-commit seats. */
export const members = defineFeature({
  name: 'members',
  label: 'members',
  window: null,
  measure: async (organizationId: string) => {
    const db = await database();
    const [current, invited] = await Promise.all([
      db.$count(schema.member, eq(schema.member.organizationId, organizationId)),
      db.$count(
        schema.invitation,
        and(
          eq(schema.invitation.organizationId, organizationId),
          eq(schema.invitation.status, 'pending'),
        ),
      ),
    ]);
    return current + invited;
  },
});

/** Requests against the public /api/v1 surface, consumed per authenticated
 * request by the API middleware. */
export const apiRequests = defineFeature({
  name: 'apiRequests',
  label: 'API requests',
  meter: { window: 'month' },
});

/** The storage quota is denominated in MB, so its cap reads as one in the
 * guard's error message. */
export const megabyte = 1024 * 1024;

/** Megabytes of files the organization holds, uploaded or reserved. Pending
 * reservations hold quota from the moment they exist, so concurrent uploads
 * cannot each pass the check against the same headroom; the hourly sweep
 * reclaims abandoned ones. Deleting a file frees the space at once. */
export const storage = defineFeature({
  name: 'storage',
  label: 'MB of storage',
  window: null,
  measure: async (organizationId: string) => {
    const db = await database();
    const [row] = await db
      .select({ bytes: sql<number>`coalesce(sum(${schema.asset.size}), 0)` })
      .from(schema.asset)
      .where(
        and(
          eq(schema.asset.organizationId, organizationId),
          inArray(schema.asset.status, ['pending', 'uploaded']),
        ),
      );
    // Rounded once over the total, not per file, or a thousand small uploads
    // would each cost a megabyte.
    return Math.ceil((row?.bytes ?? 0) / megabyte);
  },
});

/** Every billable feature. Guards and the usage report iterate this list;
 * definePlan requires an entitlement for each entry. */
export const features = [ai, members, apiRequests, storage] as const;

const free = definePlan({
  name: 'free',
  label: 'Free',
  pricePerSeat: 0,
  features: [members.limit(3), apiRequests.limit(1_000), storage.limit(100), ai.excluded()],
});

const paid = definePlan({
  name: 'paid',
  label: 'Paid',
  pricePerSeat: 10,
  features: [members.limit(25), apiRequests.limit(100_000), storage.limit(10_000), ai.included()],
});

/** The catalog. Order matters twice: the first plan is the default for
 * organizations without a subscription, and the UI renders plans and their
 * entitlement rows in the order they are written here. */
export const plans = [free, paid] as const;

/** Narrows an arbitrary string (e.g. a subscription row's `plan` column) to
 * a known plan name, defaulting to the first plan for anything else. */
export function toPlanName(value: string | null | undefined): PlanName {
  return planByName(plans, value).name;
}

/** The catalog as serializable data. The feature definitions close over
 * database queries, so client code renders from this projection instead of
 * importing the plans directly. */
export const catalog: PlanSummary[] = plans.map((plan) => ({
  name: plan.name,
  pricePerSeat: plan.pricePerSeat,
  features: plan.features.map((entitlement) => ({
    feature: entitlement.feature as FeatureName,
    kind: entitlement.kind,
    cap: entitlement.cap,
  })),
}));
