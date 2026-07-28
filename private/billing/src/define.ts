import {
  allowed,
  entitlementIn,
  limitReached,
  periodKey,
  planByName,
  unavailable,
  upsertUsage,
  usedOf,
} from './entitlements';
import { getSubscription } from './subscription';
import type {
  CountedFeature,
  Entitlement,
  EntitlementKind,
  Feature,
  FeatureName,
  FlagFeature,
  Measure,
  MeteredFeature,
  Plan,
  Window,
} from './types';

type FlagConfig<TName extends string> = { name: TName; label: () => string };
type CountedConfig<TName extends string> = FlagConfig<TName> & {
  window: Window;
  measure: Measure;
};
type MeteredConfig<TName extends string> = FlagConfig<TName> & { meter: { window: Window } };

/** Binds the feature factory to a catalog. The catalog is a getter, not an
 * import, so the plans module stays the only owner of the plan list: it
 * passes `() => plans` while still being the module that defines them. */
export function createFeatures(catalog: () => readonly Plan[]) {
  async function planFor(organizationId: string): Promise<Plan> {
    return planByName(catalog(), (await getSubscription(organizationId))?.plan);
  }

  /** A feature with nothing to count: presence in the plan is the entitlement. */
  function defineFeature<const TName extends string>(config: FlagConfig<TName>): FlagFeature<TName>;
  /** A counted feature: usage is measured from rows that already exist. */
  function defineFeature<const TName extends string>(
    config: CountedConfig<TName>,
  ): CountedFeature<TName>;
  /** A metered feature: usage is a counter that consume() maintains. */
  function defineFeature<const TName extends string>(
    config: MeteredConfig<TName>,
  ): MeteredFeature<TName>;
  function defineFeature<const TName extends string>(
    config: FlagConfig<TName> | CountedConfig<TName> | MeteredConfig<TName>,
  ): Feature {
    const { name, label } = config;
    const entitlement = (kind: EntitlementKind, cap: number | null = null): Entitlement<TName> => {
      return { feature: name, kind, cap };
    };

    if (!('measure' in config) && !('meter' in config)) {
      const require = async (organizationId: string): Promise<void> => {
        const plan = await planFor(organizationId);
        if (entitlementIn(plan, name).kind !== 'included') {
          throw unavailable(catalog(), plan, { name, label });
        }
      };
      return {
        kind: 'flag',
        name,
        label,
        included: () => entitlement('included'),
        excluded: () => entitlement('excluded'),
        require,
        can: (organizationId) => allowed(require(organizationId)),
      };
    }

    const window = 'meter' in config ? config.meter.window : config.window;
    let self: CountedFeature<TName> | MeteredFeature<TName>;

    const require = async (organizationId: string, n = 1): Promise<void> => {
      const plan = await planFor(organizationId);
      const terms = entitlementIn(plan, name);
      if (terms.kind === 'excluded') {
        throw unavailable(catalog(), plan, self);
      }
      if (terms.kind !== 'limit' || terms.cap === null) {
        return;
      }
      const used = await usedOf(organizationId, self);
      if (used + n > terms.cap) {
        throw limitReached(catalog(), plan, self, terms.cap);
      }
    };

    const shared = {
      name,
      label,
      window,
      limit: (cap: number) => entitlement('limit', cap),
      unlimited: () => entitlement('unlimited'),
      excluded: () => entitlement('excluded'),
      require,
      can: (organizationId: string, n = 1) => allowed(require(organizationId, n)),
      cap: async (organizationId: string): Promise<number | null> => {
        const terms = entitlementIn(await planFor(organizationId), name);
        if (terms.kind === 'excluded') {
          return 0;
        }
        return terms.cap;
      },
    };

    if ('measure' in config) {
      self = { ...shared, kind: 'counted', measure: config.measure };
      return self;
    }

    const consume = async (organizationId: string, n = 1): Promise<void> => {
      const plan = await planFor(organizationId);
      const terms = entitlementIn(plan, name);
      if (terms.kind === 'excluded') {
        throw unavailable(catalog(), plan, self);
      }
      const period = periodKey(window);
      if (terms.kind !== 'limit' || terms.cap === null) {
        await upsertUsage(organizationId, name, period, n, null);
        return;
      }
      // The fresh-insert path bypasses the conditional update, so the cap is
      // checked here first; racing first inserts fall through to the update.
      if (n > terms.cap) {
        throw limitReached(catalog(), plan, self, terms.cap);
      }
      if ((await upsertUsage(organizationId, name, period, n, terms.cap)) === 0) {
        throw limitReached(catalog(), plan, self, terms.cap);
      }
    };

    self = { ...shared, kind: 'metered', consume };
    return self;
  }

  return defineFeature;
}

type MissingEntitlements<E extends readonly Entitlement[]> = Exclude<
  FeatureName,
  E[number]['feature']
>;

/** A plan composed of one entitlement per feature. Compile-time exhaustive:
 * omitting a feature fails the build naming the missing entitlements, so a
 * plan must price, cap, or explicitly exclude every feature. */
export function definePlan<const TName extends string, const E extends readonly Entitlement[]>(
  config: { name: TName; label: () => string; pricePerSeat: number; features: E } & ([
    MissingEntitlements<E>,
  ] extends [never]
    ? unknown
    : { 'missing entitlements': MissingEntitlements<E>[] }),
): Plan<TName> {
  const seen = new Set<string>();
  for (const terms of config.features) {
    if (seen.has(terms.feature)) {
      throw new Error(`Plan ${config.name} has two entitlements for ${terms.feature}`);
    }
    seen.add(terms.feature);
  }
  return config;
}
