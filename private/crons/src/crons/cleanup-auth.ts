import { and, database, eq, lt, schema } from '@repo/db';

// Better Auth checks expiry on read but never deletes the rows, so expired
// sessions, verification tokens, device-flow codes, and pending invitations
// accumulate in D1 forever. This sweeps them once a day.
export async function cleanupAuth(): Promise<void> {
  const db = await database();
  const now = new Date();

  const sessions = await db.delete(schema.session).where(lt(schema.session.expiresAt, now));
  const verifications = await db
    .delete(schema.verification)
    .where(lt(schema.verification.expiresAt, now));
  const deviceCodes = await db
    .delete(schema.deviceCode)
    .where(lt(schema.deviceCode.expiresAt, now));
  // Accepted and rejected invitations stay as history; only expired pending
  // ones are dead weight.
  const invitations = await db
    .delete(schema.invitation)
    .where(and(eq(schema.invitation.status, 'pending'), lt(schema.invitation.expiresAt, now)));

  console.log(
    `[crons] cleanup-auth removed ${sessions.meta.changes} sessions, ` +
      `${verifications.meta.changes} verifications, ${deviceCodes.meta.changes} device codes, ` +
      `${invitations.meta.changes} expired invitations.`,
  );
}
