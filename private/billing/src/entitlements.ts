import { and, database, eq, schema, sql } from '@repo/db';
import { m } from '@repo/i18n/messages';

import { BillingError } from './error';
import type { CountedFeature, Entitlement, MeteredFeature, Plan, Window } from './types';

/** The plan with this name, or the first plan (the default) when the name
 * is unknown or absent. */
export function planByName<TPlan extends Plan>(
  plans: readonly [TPlan, ...TPlan[]] | readonly TPlan[],
  name: string | null | undefined,
): TPlan {
  const match = plans.find((plan) => plan.name === name);
  if (match !== undefined) {
    return match;
  }
  return plans[0];
}

/** The plan's terms for a feature. */
export function entitlementIn(plan: Plan, feature: string): Entitlement {
  const entitlement = plan.features.find((candidate) => candidate.feature === feature);
  // Unreachable when the catalog compiles: definePlan demands an entitlement
  // for every feature. Kept for JS callers and half-migrated catalogs.
  if (entitlement === undefined) {
    throw new Error(`Plan ${plan.name} has no entitlement for ${feature}`);
  }
  return entitlement;
}

function windowStart(window: Window): Date | null {
  if (window === null) {
    return null;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** The usage-table bucket for a window: '2026-07' style for monthly windows,
 * 'all' for meters that never reset. */
export function periodKey(window: Window): string {
  if (window === null) {
    return 'all';
  }
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Current usage of a measured feature. */
export async function usedOf(
  organizationId: string,
  feature: CountedFeature | MeteredFeature,
): Promise<number> {
  if (feature.kind === 'counted') {
    return feature.measure(organizationId, windowStart(feature.window));
  }
  const db = await database();
  const row = await db.query.usage.findFirst({
    where: and(
      eq(schema.usage.organizationId, organizationId),
      eq(schema.usage.meter, feature.name),
      eq(schema.usage.period, periodKey(feature.window)),
    ),
  });
  return row?.used ?? 0;
}

// Guard messages resolve their locale when the error is built: inside a
// request Paraglide's AsyncLocalStorage scope pins the caller's locale, and
// outside one (tests, jobs, the public API) they fall back to English.

/** The guard error for a feature the plan excludes. */
export function unavailable(
  plans: readonly Plan[],
  plan: Plan,
  feature: { name: string; label: () => string },
): BillingError {
  const upgrade = plans.find((candidate) => {
    const terms = candidate.features.find((e) => e.feature === feature.name);
    return terms !== undefined && terms.kind !== 'excluded';
  });
  const message =
    upgrade === undefined
      ? m.billing_feature_unavailable({ label: feature.label() })
      : m.billing_plan_required({ plan: upgrade.label() });
  return new BillingError('feature-unavailable', plan.name, feature.name, message);
}

/** The guard error for a capped feature at its limit. */
export function limitReached(
  plans: readonly Plan[],
  plan: Plan,
  feature: { name: string; label: () => string },
  cap: number,
): BillingError {
  // Only hint at upgrading when some other plan actually offers more.
  const better = plans.some((candidate) => {
    if (candidate.name === plan.name) {
      return false;
    }
    const terms = candidate.features.find((e) => e.feature === feature.name);
    if (terms === undefined) {
      return false;
    }
    return terms.kind === 'unlimited' || (terms.kind === 'limit' && (terms.cap ?? 0) > cap);
  });
  const inputs = { plan: plan.label(), cap, label: feature.label() };
  const message = better
    ? m.billing_limit_reached_upgrade(inputs)
    : m.billing_limit_reached(inputs);
  return new BillingError('limit-reached', plan.name, feature.name, message);
}

/** Records n units on a meter's period bucket, guarded by the plan cap when
 * one applies, and reports how many rows were written: the conditional
 * update applies zero rows when the guard fails, and RETURNING surfaces
 * that uniformly across D1 and better-sqlite3. */
export async function upsertUsage(
  organizationId: string,
  meter: string,
  period: string,
  n: number,
  cap: number | null,
): Promise<number> {
  const guard = cap === null ? undefined : sql`${schema.usage.used} + ${n} <= ${cap}`;
  const db = await database();
  const applied = await db
    .insert(schema.usage)
    .values({ organizationId, meter, period, used: n })
    .onConflictDoUpdate({
      target: [schema.usage.organizationId, schema.usage.meter, schema.usage.period],
      set: { used: sql`${schema.usage.used} + ${n}`, updatedAt: new Date() },
      setWhere: guard,
    })
    .returning();
  return applied.length;
}

/** Resolves a guard check to a boolean, treating BillingError as false. */
export async function allowed(check: Promise<void>): Promise<boolean> {
  try {
    await check;
    return true;
  } catch (error) {
    if (error instanceof BillingError) {
      return false;
    }
    throw error;
  }
}
