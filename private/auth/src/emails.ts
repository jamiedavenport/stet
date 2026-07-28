import { eq, schema } from '@repo/db';
import type { Database } from '@repo/db';
import type { Mailer } from '@repo/mail';
import type { BetterAuthOptions } from 'better-auth';
import type { MagicLinkOptions } from 'better-auth/plugins';

type UserOptions = NonNullable<BetterAuthOptions['user']>;

/** The mail-sending callbacks Better Auth's options and plugins take. */
export type AuthEmails = {
  resetPassword: NonNullable<
    NonNullable<BetterAuthOptions['emailAndPassword']>['sendResetPassword']
  >;
  verification: NonNullable<
    NonNullable<BetterAuthOptions['emailVerification']>['sendVerificationEmail']
  >;
  changeEmail: NonNullable<NonNullable<UserOptions['changeEmail']>['sendChangeEmailConfirmation']>;
  deleteAccount: NonNullable<
    NonNullable<UserOptions['deleteUser']>['sendDeleteAccountVerification']
  >;
  magicLink: MagicLinkOptions['sendMagicLink'];
};

// The callbacks type the user without additionalFields; the locale column
// exists on every row.
function localeOf(user: object): string | null | undefined {
  return (user as { locale?: string | null }).locale;
}

/**
 * Binds every transactional email Better Auth sends to the app's mailer. The
 * recipient's stored locale rides along so each message is delivered in the
 * language they picked.
 */
export function authEmails({
  mailer,
  database,
}: {
  mailer: Mailer;
  database: Database;
}): AuthEmails {
  return {
    resetPassword: async ({ user, url }) => {
      await mailer.sendResetPassword({
        to: user.email,
        name: user.name,
        resetLink: url,
        locale: localeOf(user),
      });
    },

    verification: async ({ user, url }) => {
      await mailer.sendVerificationEmail({
        to: user.email,
        name: user.name,
        verifyLink: url,
        locale: localeOf(user),
      });
    },

    // Fires only when the current address is already verified: the link goes
    // to the old address so a hijacked session cannot silently move the
    // account to an attacker's inbox.
    changeEmail: async ({ user, newEmail, url }) => {
      await mailer.sendChangeEmail({
        to: user.email,
        name: user.name,
        newEmail,
        confirmLink: url,
        locale: localeOf(user),
      });
    },

    deleteAccount: async ({ user, url }) => {
      await mailer.sendDeleteAccount({
        to: user.email,
        name: user.name,
        deleteLink: url,
        locale: localeOf(user),
      });
    },

    magicLink: async ({ email, url }) => {
      const recipient = await database.query.user.findFirst({
        where: eq(schema.user.email, email),
      });
      // The request endpoint returns ok either way, so skipping the send for
      // unknown addresses keeps account existence unguessable.
      if (recipient === undefined) {
        console.log(`[auth] No account for ${email}, skipping magic link email`);
        return;
      }
      await mailer.sendMagicLink({
        to: email,
        name: recipient.name,
        magicLink: url,
        locale: recipient.locale,
      });
    },
  };
}
