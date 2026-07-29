import { apiKey } from '@better-auth/api-key';
import { passkey } from '@better-auth/passkey';
import { stripe } from '@better-auth/stripe';
import type { D1Database } from '@cloudflare/workers-types';
import { brand } from '@repo/brand';
import { createDb, schema } from '@repo/db';
import type { Mailer } from '@repo/mail';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  admin,
  bearer,
  deviceAuthorization,
  magicLink,
  mcp,
  organization,
  twoFactor,
} from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

// Root-level OAuth discovery for MCP clients; the worker mounts these at
// /.well-known (see apps/web/src/server.ts).
export { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from 'better-auth/plugins';

import { purgeAssets } from './assets.ts';
import { turnstilePlugin } from './captcha.ts';
import { authEmails } from './emails.ts';
import { authDatabaseHooks } from './hooks.ts';
import { organizationOptions } from './organization.ts';
import { socialProviders } from './social.ts';
import { stripeOptions } from './stripe.ts';

export type CreateAuthOptions = {
  db: D1Database;
  secret: string;
  // Absolute origin of the app; also used to build invite links in emails.
  baseURL: string;
  mailer: Mailer;
  // A sandbox key locally (see private/billing/README.md). Optional: plan
  // guards work without Stripe, but checkout needs all three values.
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePricePaid?: string;
  // Social sign-in. Each provider is enabled only when both halves are set,
  // so a deployment can ship with none, one, or both configured.
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  // Cloudflare Turnstile. When set, the credential endpoints require a token
  // in the x-captcha-response header; unset disables bot protection (and the
  // web app hides the widget).
  turnstileSecretKey?: string;
  // The worker's waitUntil. When set, non-critical writes (the api-key
  // plugin's lastRequest/requestCount tracking) run after the response
  // instead of on the request's critical path.
  waitUntil?: (promise: Promise<unknown>) => void;
};

/**
 * Builds the Better Auth instance served at `/api/auth/*`. Each plugin's
 * configuration lives in its own module; the plugins array itself stays a
 * static literal here because Better Auth infers its types from it.
 */
export function createAuth({
  db,
  secret,
  baseURL,
  mailer,
  stripeSecretKey,
  stripeWebhookSecret,
  stripePricePaid,
  googleClientId,
  googleClientSecret,
  githubClientId,
  githubClientSecret,
  turnstileSecretKey,
  waitUntil,
}: CreateAuthOptions) {
  const database = createDb(db);
  const emails = authEmails({ mailer, database });

  return betterAuth({
    advanced: waitUntil === undefined ? {} : { backgroundTasks: { handler: waitUntil } },
    database: drizzleAdapter(database, { provider: 'sqlite', schema }),
    // Names the TOTP issuer shown in authenticator apps.
    appName: brand.name,
    secret,
    baseURL,
    socialProviders: socialProviders({
      googleClientId,
      googleClientSecret,
      githubClientId,
      githubClientSecret,
    }),
    account: {
      // Sign in with a social provider whose verified email matches an
      // existing account and Better Auth links them instead of erroring.
      accountLinking: {
        enabled: true,
        trustedProviders: ['email-password', 'google', 'github'],
      },
    },
    emailAndPassword: {
      enabled: true,
      sendResetPassword: emails.resetPassword,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendVerificationEmail: emails.verification,
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    },
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: emails.changeEmail,
      },
      deleteUser: {
        enabled: true,
        // Match the one-hour window the email copy promises (default is a day).
        deleteTokenExpiresIn: 60 * 60,
        beforeDelete: async (user) => {
          await purgeAssets('user', user.id);
        },
        // Deletion is confirmed by a link mailed to the account, which works
        // for password and social-only users alike.
        sendDeleteAccountVerification: emails.deleteAccount,
      },
    },
    session: {
      // The default fresh-session check (24h) would 403 listSessions once a
      // sign-in is a day old, breaking the active-sessions card. Safe to
      // disable here: every sensitive action re-authenticates explicitly
      // instead (password prompts on change-password and two-factor, mailed
      // confirmation links for email change and account deletion).
      freshAge: 0,
      cookieCache: {
        // Serves getSession from a short-lived signed cookie instead of a D1
        // query on every request. Better Auth rewrites the cookie on session
        // mutations (sign-in/out, setActive, updateUser), so the maxAge only
        // bounds staleness for out-of-band revocation.
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    databaseHooks: authDatabaseHooks(database),
    plugins: [
      turnstilePlugin(turnstileSecretKey),
      // Lets CLIs and other non-browser clients authenticate with
      // `Authorization: Bearer <session token>`.
      bearer(),
      magicLink({
        // Sign-in only: without an account the link could only create a user
        // with no name, and the sign-up page collects one.
        disableSignUp: true,
        // The emailed token is a bearer credential; store only its hash.
        storeToken: 'hashed',
        sendMagicLink: emails.magicLink,
      }),
      // WebAuthn passkeys, registered from the account security settings.
      // The relying party id is the app's hostname, so passkeys are bound to
      // the deployed origin.
      passkey({
        rpID: new URL(baseURL).hostname,
        rpName: brand.name,
        origin: baseURL,
      }),
      // TOTP second factor with backup codes. Sign-in for an enrolled user
      // stops after the password and returns twoFactorRedirect; the client
      // finishes on /sign/2fa.
      twoFactor(),
      deviceAuthorization({
        verificationUri: '/device',
        expiresIn: '10m',
        interval: '5s',
      }),
      // OAuth provider for MCP clients (Claude, editors): dynamic client
      // registration plus the authorize/token endpoints, all under
      // /api/auth/mcp/*. A signed-out authorize redirects to the sign-in
      // page and the plugin's own hook resumes the flow after the session
      // lands. The worker validates the issued tokens at /mcp with
      // auth.api.getMcpSession.
      mcp({ loginPage: '/sign/in' }),
      // Organization-owned API keys for the public /api/v1 surface. Keys are
      // created through the Better Auth api-key endpoints by org members (the
      // plugin checks membership) and sent as `x-api-key` on API requests.
      apiKey({
        defaultPrefix: `${brand.slug}_`,
        references: 'organization',
        // verifyApiKey writes lastRequest/requestCount on every call; defer
        // it off the request path so API reads pay one D1 query, not two.
        deferUpdates: true,
        // The plugin's own per-key limit defaults to 10 requests a day, which
        // would break any real content client. The worker already throttles
        // /api/v1 per key (API_RATE_LIMIT) and billing caps monthly usage.
        rateLimit: { enabled: false },
      }),
      // Platform staff: user.role ('user' or 'admin'), bans, and
      // impersonation, behind /app/admin. The role column is not
      // client-writable, so the first admin is promoted with SQL (see
      // DEPLOY.md) and promotes the rest from the panel. Its ban check runs as
      // a session-create hook alongside the app's own; plugin hooks run first,
      // so a banned user is rejected before the org lookup.
      admin(),
      organization(organizationOptions({ baseURL, mailer })),
      // Placed after organization() because it wraps the organization hooks.
      stripe(stripeOptions({ database, stripeSecretKey, stripeWebhookSecret, stripePricePaid })),
      // Last so cookies set by other plugins' after-hooks still reach the
      // framework cookie store (Better Auth warns otherwise).
      tanstackStartCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
