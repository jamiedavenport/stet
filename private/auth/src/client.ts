import { passkeyClient } from '@better-auth/passkey/client';
import { stripeClient } from '@better-auth/stripe/client';
import {
  adminClient,
  deviceAuthorizationClient,
  inferAdditionalFields,
  magicLinkClient,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import type { Auth } from './server.ts';

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    deviceAuthorizationClient(),
    // Types the twoFactor.* methods and flags twoFactorRedirect on sign-in
    // responses. No onTwoFactorRedirect: the sign-in page navigates to
    // /sign/2fa itself so the ?redirect search param survives the hop.
    twoFactorClient(),
    magicLinkClient(),
    passkeyClient(),
    // Types authClient.admin.* (listUsers, ban, setRole, impersonate) for the
    // admin panel, and adds role/banned to the user type it infers.
    adminClient(),
    stripeClient({ subscription: true }),
    // Types the server's user.additionalFields (locale) on updateUser and
    // session reads.
    inferAdditionalFields<Auth>(),
  ],
});

export type AuthClient = typeof authClient;
