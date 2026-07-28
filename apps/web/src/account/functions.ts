import { authClient } from '@repo/auth/client';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';

import { auth } from '#/auth-server';
import { authenticatedMiddleware } from '#/session';

// The credential provider id Better Auth uses for email + password accounts.
const CREDENTIAL_PROVIDER = 'credential';

// Better Auth blocks setPassword from the client, so a social-only user adds a
// password through this server function instead (no current password needed
// because they never had one).
export const setInitialPassword = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator((newPassword: string) => newPassword)
  .handler(async ({ data: newPassword, context }) => {
    await auth.api.setPassword({ body: { newPassword }, headers: context.headers });
  });

// Linked accounts (credential and social) for the signed-in user. Client-only:
// these hit /api/auth with the session cookie after hydration.
export const accountsQuery = queryOptions({
  queryKey: ['accounts'],
  queryFn: async () => {
    const { data, error } = await authClient.listAccounts();
    if (error) {
      throw new Error(error.message ?? 'Something went wrong. Try again.');
    }
    return data ?? [];
  },
});

// Registered WebAuthn passkeys for the signed-in user.
export const passkeysQuery = queryOptions({
  queryKey: ['passkeys'],
  queryFn: async () => {
    const { data, error } = await authClient.passkey.listUserPasskeys();
    if (error) {
      throw new Error(error.message ?? 'Something went wrong. Try again.');
    }
    return data ?? [];
  },
});

// Active sessions across the user's devices.
export const sessionsQuery = queryOptions({
  queryKey: ['sessions'],
  queryFn: async () => {
    const { data, error } = await authClient.listSessions();
    if (error) {
      throw new Error(error.message ?? 'Something went wrong. Try again.');
    }
    return data ?? [];
  },
});

export type LinkedAccount = { providerId: string };

// A social-only user has no credential row and must set a password before the
// change-password form makes sense.
export function hasPassword(accounts: LinkedAccount[]): boolean {
  return accounts.some((account) => account.providerId === CREDENTIAL_PROVIDER);
}
