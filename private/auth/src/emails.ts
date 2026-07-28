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

/** Binds every transactional email Better Auth sends to the app's mailer. */
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
      });
    },

    verification: async ({ user, url }) => {
      await mailer.sendVerificationEmail({
        to: user.email,
        name: user.name,
        verifyLink: url,
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
      });
    },

    deleteAccount: async ({ user, url }) => {
      await mailer.sendDeleteAccount({
        to: user.email,
        name: user.name,
        deleteLink: url,
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
      });
    },
  };
}
