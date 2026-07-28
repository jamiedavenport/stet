import type { OrganizationRole } from '@repo/auth/access';
import { and, database, eq, schema } from '@repo/db';
import { notFound } from '@tanstack/react-router';

// Not in #/session, which client components import for isPlatformAdmin: a
// plain export querying the database would follow them into the browser
// bundle. Server functions and middleware are exempt, their bodies are stripped.

/**
 * The caller's active organization and their role in it, verified against the
 * member row rather than the session, whose cookie cache keeps a removed
 * organization alive for up to its maxAge.
 */
export async function requireActiveOrganization(session: {
  session: { activeOrganizationId?: string | null };
  user: { id: string };
}): Promise<{ organizationId: string; role: OrganizationRole }> {
  const organizationId = session.session.activeOrganizationId ?? null;
  if (organizationId === null) {
    throw notFound();
  }
  const db = await database();
  const membership = await db.query.member.findFirst({
    where: and(
      eq(schema.member.organizationId, organizationId),
      eq(schema.member.userId, session.user.id),
    ),
  });
  if (membership === undefined) {
    throw notFound();
  }
  return { organizationId, role: membership.role as OrganizationRole };
}
