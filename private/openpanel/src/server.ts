import { OpenPanel } from '@openpanel/sdk';
import { brand } from '@repo/brand';
import { env, waitUntil } from 'cloudflare:workers';

import type { EventName, EventProperties } from './events';
import { registry } from './events';
import { toProfileName } from './profile';

// The two credentials the Worker needs (apps/web/wrangler.jsonc: a var and a
// secret). Cloudflare.Env is only populated by the app's generated types, so
// this package names what it reads and casts once at the boundary.
type AnalyticsEnv = {
  OPENPANEL_CLIENT_ID?: string;
  OPENPANEL_CLIENT_SECRET?: string;
};

// Lazy singleton: undefined until first use, null when credentials are
// missing (then every call logs to the console instead, the local-dev
// default; e2e tests can assert on the `[analytics]` lines).
let client: OpenPanel | null | undefined;

function getClient(): OpenPanel | null {
  if (client === undefined) {
    const { OPENPANEL_CLIENT_ID: clientId, OPENPANEL_CLIENT_SECRET: clientSecret } =
      env as AnalyticsEnv;
    if (
      clientId === undefined ||
      clientId === '' ||
      clientSecret === undefined ||
      clientSecret === ''
    ) {
      console.log('[analytics] OPENPANEL_CLIENT_ID/SECRET not set, events are logged only');
      client = null;
    } else {
      client = new OpenPanel({ clientId, clientSecret, sdk: `${brand.slug}-server` });
    }
  }
  return client;
}

// Hands the delivery promise to the runtime so the response is never blocked
// on OpenPanel. Falls back to letting the promise float when no request
// context is active (for example in tests).
function deliver(promise: Promise<unknown>): void {
  try {
    waitUntil(promise);
  } catch {
    void promise;
  }
}

export type CaptureOptions<TName extends EventName> = {
  // Ties the event to a user profile. Omit for events that happen outside a
  // user's request, like webhook-driven billing changes.
  userId?: string;
  // Associates the event with an organization (as an OpenPanel group and an
  // `organizationId` property).
  organizationId?: string;
} & (Record<string, never> extends EventProperties<TName>
  ? { properties?: EventProperties<TName> }
  : { properties: EventProperties<TName> });

/**
 * Records a product event from the Worker. The name and properties are typed
 * from the registry in events.ts and validated before sending. Best-effort
 * and non-blocking: it never throws and never delays the response.
 */
export function capture<TName extends EventName>(
  name: TName,
  options: CaptureOptions<TName>,
): void {
  const parsed = registry[name].schema.safeParse(options.properties ?? {});
  if (!parsed.success) {
    console.error(`[analytics] Dropped ${name}, properties failed the schema:`, parsed.error);
    return;
  }
  const properties: Record<string, unknown> = { ...parsed.data };
  if (options.organizationId !== undefined) {
    properties.organizationId = options.organizationId;
  }

  const openpanel = getClient();
  if (openpanel === null) {
    console.log(`[analytics] ${name}`, { ...properties, userId: options.userId });
    return;
  }
  deliver(
    openpanel.track(name, {
      ...properties,
      profileId: options.userId,
      groups: options.organizationId === undefined ? undefined : [options.organizationId],
    }),
  );
}

/**
 * Creates or updates the OpenPanel profile for a user. Called once at
 * signup; profile traits are not events, so this stays separate from
 * capture().
 */
export function identifyUser(user: { id: string; name?: string; email?: string }): void {
  const openpanel = getClient();
  if (openpanel === null) {
    console.log('[analytics] identify', user);
    return;
  }
  // The SDK skips the network call (returning undefined) when the payload
  // has no traits beyond the profile id.
  const delivery = openpanel.identify({
    profileId: user.id,
    ...toProfileName(user.name),
    email: user.email,
  });
  if (delivery !== undefined) {
    deliver(delivery);
  }
}

/**
 * Names an organization's OpenPanel group so dashboards show the
 * organization instead of a bare id. Called when an organization is created
 * or renamed.
 */
export function upsertOrganizationGroup(organization: { id: string; name: string }): void {
  const openpanel = getClient();
  if (openpanel === null) {
    console.log('[analytics] group', organization);
    return;
  }
  deliver(
    openpanel.upsertGroup({
      id: organization.id,
      type: 'organization',
      name: organization.name,
    }),
  );
}
