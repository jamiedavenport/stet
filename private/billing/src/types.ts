import type { features, plans } from './plans';

/** When a feature's usage window resets: 'month' buckets by calendar month
 * (UTC); null means usage never resets. */
export type Window = 'month' | null;

export type EntitlementKind = 'included' | 'excluded' | 'limit' | 'unlimited';

/** One feature's terms inside a plan, produced by the feature's entitlement
 * builders (included, excluded, limit, unlimited). */
export type Entitlement<TFeature extends string = string> = {
  feature: TFeature;
  kind: EntitlementKind;
  /** The cap when kind is 'limit'; null otherwise. */
  cap: number | null;
};

export type Plan<TName extends string = string> = {
  name: TName;
  /** Localized label message, resolved when a guard error is built so the
   * text follows the caller's locale. */
  label: () => string;
  /** Monthly price per seat in USD. */
  pricePerSeat: number;
  features: readonly Entitlement[];
};

/** How a counted feature derives usage from existing rows. `since` is the
 * start of the feature's window, null for windowless features. */
export type Measure = (organizationId: string, since: Date | null) => Promise<number>;

type Guarded = {
  /** Whether the organization's plan allows (n more of) this feature. */
  can: (organizationId: string, n?: number) => Promise<boolean>;
  /** Like can(), but throws BillingError instead of returning false. */
  require: (organizationId: string, n?: number) => Promise<void>;
};

/** A feature with nothing to count: presence in the plan is the entitlement. */
export type FlagFeature<TName extends string = string> = Guarded & {
  kind: 'flag';
  name: TName;
  label: () => string;
  included: () => Entitlement<TName>;
  excluded: () => Entitlement<TName>;
};

type MeasuredFeature<TName extends string> = Guarded & {
  name: TName;
  label: () => string;
  window: Window;
  limit: (cap: number) => Entitlement<TName>;
  unlimited: () => Entitlement<TName>;
  excluded: () => Entitlement<TName>;
  /** The plan's cap: a number, null when unlimited, 0 when excluded. */
  cap: (organizationId: string) => Promise<number | null>;
};

/** Usage is derived by counting rows that exist, so deleting frees capacity. */
export type CountedFeature<TName extends string = string> = MeasuredFeature<TName> & {
  kind: 'counted';
  measure: Measure;
};

/** Usage is a counter in the usage table, maintained by consume(). */
export type MeteredFeature<TName extends string = string> = MeasuredFeature<TName> & {
  kind: 'metered';
  /** Atomically records n units, throwing BillingError when that would
   * exceed the plan's cap. */
  consume: (organizationId: string, n?: number) => Promise<void>;
};

export type Feature = FlagFeature | CountedFeature | MeteredFeature;

export type FeatureName = (typeof features)[number]['name'];

type MeasuredFeatureName = Extract<
  (typeof features)[number],
  { kind: 'counted' } | { kind: 'metered' }
>['name'];

/** One row of the usage report: a measured feature's consumption against the
 * organization's plan. cap null means unlimited. */
export type Usage = {
  feature: MeasuredFeatureName;
  used: number;
  cap: number | null;
  window: Window;
};

export type PlanName = (typeof plans)[number]['name'];

/** A JSON-safe view of one plan, for client rendering (pricing cards). */
export type PlanSummary = {
  name: PlanName;
  pricePerSeat: number;
  features: Array<{ feature: FeatureName; kind: EntitlementKind; cap: number | null }>;
};
