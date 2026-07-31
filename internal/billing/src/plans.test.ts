import { describe, expect, it } from 'vite-plus/test';

import { definePlan } from './define';
import { ai, apiRequests, catalog, members, plans, storage, toPlanName } from './plans';

describe('the plan catalog', () => {
  it('prices the free plan at zero and the paid plan above it', () => {
    expect(plans[0].name).toBe('free');
    expect(plans[0].pricePerSeat).toBe(0);
    expect(plans[1].pricePerSeat).toBeGreaterThan(0);
  });

  it('narrows arbitrary strings to a plan name', () => {
    expect(toPlanName('paid')).toBe('paid');
    expect(toPlanName('free')).toBe('free');
    expect(toPlanName('enterprise')).toBe('free');
    expect(toPlanName(null)).toBe('free');
    expect(toPlanName(undefined)).toBe('free');
  });

  it('projects a serializable catalog for the client', () => {
    expect(catalog.map((plan) => plan.name)).toEqual(['free', 'paid']);
    const free = catalog[0];
    const paid = catalog[1];
    expect(free?.features).toEqual([
      { feature: 'members', kind: 'limit', cap: 3 },
      { feature: 'apiRequests', kind: 'limit', cap: 1_000 },
      { feature: 'storage', kind: 'limit', cap: 100 },
      { feature: 'ai', kind: 'excluded', cap: null },
    ]);
    expect(paid?.features).toEqual([
      { feature: 'members', kind: 'limit', cap: 25 },
      { feature: 'apiRequests', kind: 'limit', cap: 100_000 },
      { feature: 'storage', kind: 'limit', cap: 10_000 },
      { feature: 'ai', kind: 'included', cap: null },
    ]);
  });
});

describe('definePlan and definePlans', () => {
  it('rejects two entitlements for the same feature', () => {
    expect(() =>
      definePlan({
        name: 'broken',
        label: 'Broken',
        pricePerSeat: 0,
        features: [
          members.limit(1),
          members.limit(2),
          apiRequests.excluded(),
          storage.excluded(),
          ai.excluded(),
        ],
      }),
    ).toThrow('two entitlements');
  });

  it('rejects plans missing an entitlement at compile time', () => {
    const invalid = () =>
      // @ts-expect-error every feature needs an entitlement; ai is missing
      definePlan({
        name: 'partial',
        label: 'Partial',
        pricePerSeat: 0,
        features: [members.limit(1), apiRequests.limit(1)],
      });
    expect(invalid).toBeDefined();
  });
});
