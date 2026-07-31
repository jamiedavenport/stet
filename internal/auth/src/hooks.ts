import { capture } from '@dogfood/analytics/server';
import { eq, schema } from '@repo/db';
import type { Database } from '@repo/db';
import { enqueue } from '@repo/jobs/client';
import type { BetterAuthOptions } from 'better-auth';

/** The app's side effects around Better Auth's own writes. */
export function authDatabaseHooks(database: Database): BetterAuthOptions['databaseHooks'] {
  return {
    user: {
      create: {
        // Best-effort: a queue hiccup must never fail the signup request.
        after: async (user) => {
          capture({ userId: user.id }, 'signup');
          try {
            await enqueue('send-welcome-email', { userId: user.id });
          } catch (error) {
            console.error(`[auth] Failed to enqueue welcome email for user ${user.id}:`, error);
          }
        },
      },
    },
    session: {
      create: {
        // New sessions start scoped to the user's first organization so the
        // app always has an active org without a client round-trip.
        before: async (session) => {
          const membership = await database.query.member.findFirst({
            where: eq(schema.member.userId, session.userId),
          });
          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  };
}
