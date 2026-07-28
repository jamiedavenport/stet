import { and, database, eq, inArray, schema } from '@repo/db';

import { isPlatformAdmin } from '#/session';

type AssetOwner = {
  organizationId: string | null;
  /** Null once the uploader closes their account; see the schema in @repo/db. */
  uploadedBy: string | null;
};

type Viewer = {
  id: string;
  role?: string | null;
};

/**
 * Whether `viewer` may read an asset. Organization assets are tenant data, so
 * platform staff are deliberately not exempt; personal assets are visible
 * wherever their owner is, which is what makes avatars work.
 *
 * Membership is read fresh rather than from the session, whose cookie cache
 * can outlive a removal by its maxAge.
 */
export async function canReadAsset(asset: AssetOwner, viewer: Viewer): Promise<boolean> {
  if (asset.uploadedBy !== null && asset.uploadedBy === viewer.id) {
    return true;
  }

  const db = await database();

  if (asset.organizationId !== null) {
    const membership = await db.query.member.findFirst({
      where: and(
        eq(schema.member.organizationId, asset.organizationId),
        eq(schema.member.userId, viewer.id),
      ),
    });
    return membership !== undefined;
  }

  if (isPlatformAdmin(viewer)) {
    return true;
  }

  // An owner who has gone shares an organization with nobody.
  if (asset.uploadedBy === null) {
    return false;
  }

  const viewerOrganizations = db
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, viewer.id));
  const shared = await db.query.member.findFirst({
    where: and(
      eq(schema.member.userId, asset.uploadedBy),
      inArray(schema.member.organizationId, viewerOrganizations),
    ),
  });
  return shared !== undefined;
}
