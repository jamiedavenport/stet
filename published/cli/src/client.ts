import { createAuthClient } from 'better-auth/client';
import { deviceAuthorizationClient, organizationClient } from 'better-auth/client/plugins';

const DEFAULT_ORIGIN = 'https://onyx.jxd.dev';

// Identifies this CLI in device authorization requests.
export const CLI_CLIENT_ID = 'onyx-cli';

// Precedence: --url flag, then ONYX_API_URL, then the hosted app.
export function resolveOrigin(explicitUrl: string | undefined): string {
  if (explicitUrl !== undefined && explicitUrl !== '') {
    return explicitUrl;
  }
  const fromEnv = process.env.ONYX_API_URL;
  if (fromEnv !== undefined && fromEnv !== '') {
    return fromEnv;
  }
  return DEFAULT_ORIGIN;
}

export function createClient(origin: string) {
  return createAuthClient({
    baseURL: origin,
    plugins: [deviceAuthorizationClient(), organizationClient()],
  });
}

export type Client = ReturnType<typeof createClient>;
