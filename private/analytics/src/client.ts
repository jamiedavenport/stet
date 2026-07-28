import { OpenPanel } from '@openpanel/web';

import type { EventName, EventProperties } from './events';
import { toProfileName } from './profile';

// One OpenPanel instance per page, created by initAnalytics. Stays null
// during SSR and when no client id is configured; every function below then
// logs to the console instead, which is also the local-dev default.
let client: OpenPanel | null = null;

// Whether identifyUser has attached a profile. Guards clearAnalyticsIdentity
// so signed-out visitors never lose their anonymous device session.
let identified = false;

/**
 * Creates the browser OpenPanel client. Call once from the root component;
 * calls without a client id (or outside the browser) are no-ops, so local
 * dev without OPENPANEL_CLIENT_ID falls back to console logging.
 */
export function initAnalytics(options: { clientId: string | null }): void {
  if (client !== null || typeof document === 'undefined') {
    return;
  }
  if (options.clientId === null || options.clientId === '') {
    return;
  }
  client = new OpenPanel({
    clientId: options.clientId,
    trackScreenViews: true,
    trackOutgoingLinks: true,
    // Off so the typed registry stays the only way to record events;
    // data-track attributes would bypass it with untyped names.
    trackAttributes: false,
  });
}

// Properties may be omitted when the event's schema has no required keys.
type TrackArgs<TName extends EventName> =
  Record<string, never> extends EventProperties<TName>
    ? [properties?: EventProperties<TName>]
    : [properties: EventProperties<TName>];

/**
 * Records a product event from the browser. The name and properties are
 * typed from the registry in events.ts. Fire-and-forget: failures never
 * surface to the UI.
 */
export function track<TName extends EventName>(name: TName, ...args: TrackArgs<TName>): void {
  const properties = args[0] ?? {};
  if (client === null) {
    console.log(`[analytics] ${name}`, properties);
    return;
  }
  void client.track(name, properties);
}

export type AnalyticsUser = {
  id: string;
  name?: string;
  email?: string;
};

/**
 * Attaches the signed-in user to the OpenPanel profile. Safe to call on
 * every session change; no-ops without an initialized client.
 */
export function identifyUser(user: AnalyticsUser): void {
  if (client === null) {
    return;
  }
  identified = true;
  void client.identify({
    profileId: user.id,
    ...toProfileName(user.name),
    email: user.email,
  });
}

/**
 * Associates subsequent browser events with the active organization, both as
 * an OpenPanel group and as an `organizationId` property for filtering.
 */
export function setActiveOrganization(organizationId: string): void {
  if (client === null) {
    return;
  }
  client.setGlobalProperties({ organizationId });
  void client.setGroup(organizationId);
}

/**
 * Drops the profile, group, and device association on sign-out so the next
 * visitor on this browser starts an anonymous session. No-op unless
 * identifyUser ran first.
 */
export function clearAnalyticsIdentity(): void {
  if (client === null || !identified) {
    return;
  }
  identified = false;
  client.clear();
}
