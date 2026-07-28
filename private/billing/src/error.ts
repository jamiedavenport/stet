/** Thrown by billing guards; callers map it onto their layer's error shape
 * (HTTP 403/429, oRPC error, form message, ...). */
export class BillingError extends Error {
  readonly code: 'feature-unavailable' | 'limit-reached';
  /** The organization's plan when the guard fired. */
  readonly plan: string;
  /** The feature whose entitlement failed. */
  readonly feature: string;

  constructor(code: BillingError['code'], plan: string, feature: string, message: string) {
    super(message);
    this.name = 'BillingError';
    this.code = code;
    this.plan = plan;
    this.feature = feature;
  }
}
