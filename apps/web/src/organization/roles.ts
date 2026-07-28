import { canManageOrganization } from '@repo/auth/access';
import type { OrganizationRole } from '@repo/auth/access';

/** Displays a member role through the message catalog so it translates. */
export function roleLabel(role: string): string {
  switch (role) {
    case 'owner':
      return 'owner';
    case 'admin':
      return 'admin';
    default:
      return 'member';
  }
}

/**
 * The roles a viewer may assign: owners grant anything, admins grant member
 * and admin, members grant nothing. Better Auth enforces the same rules
 * server-side; this only decides what the UI offers.
 */
export function assignableRoles(viewerRole: OrganizationRole): OrganizationRole[] {
  if (viewerRole === 'owner') {
    return ['member', 'admin', 'owner'];
  }
  if (viewerRole === 'admin') {
    return ['member', 'admin'];
  }
  return [];
}

/**
 * Whether the viewer may change this member's role. Own rows are locked (the
 * server guards an owner demoting themselves out of the last ownership, but
 * offering it at all invites lockouts) and only owners may touch owners.
 */
export function canChangeRole(
  viewer: { userId: string; role: OrganizationRole },
  target: { userId: string; role: string },
): boolean {
  if (viewer.userId === target.userId) {
    return false;
  }
  if (!canManageOrganization(viewer.role)) {
    return false;
  }
  if (target.role === 'owner' && viewer.role !== 'owner') {
    return false;
  }
  return true;
}
