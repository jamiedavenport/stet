import { createAccessControl } from 'better-auth/plugins/access';
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access';

/**
 * Organization permission statements: Better Auth's defaults plus the
 * `apiKey` resource the api-key plugin checks on every organization-key
 * operation. Without it only owners pass (`allowCreatorAllPermissions`);
 * declaring it here brings admins into key management.
 */
export const statement = {
  ...defaultStatements,
  apiKey: ['create', 'read', 'update', 'delete'],
} as const;

export const accessControl = createAccessControl(statement);

const apiKeyAll = statement.apiKey;

/**
 * The three built-in organization roles with their permissions. Owners and
 * admins manage organization configuration (members, invitations, API keys);
 * members get read access to the roster and nothing else.
 */
export const roles = {
  owner: accessControl.newRole({ ...ownerAc.statements, apiKey: apiKeyAll }),
  admin: accessControl.newRole({ ...adminAc.statements, apiKey: apiKeyAll }),
  member: accessControl.newRole({ ...memberAc.statements }),
};

/** A member's role within an organization, as stored on the member row. */
export type OrganizationRole = keyof typeof roles;

/**
 * Whether a role may change organization configuration: webhooks, API keys,
 * billing. The single definition every layer (middlewares, UI hints) shares.
 */
export function canManageOrganization(role: string): boolean {
  return role === 'owner' || role === 'admin';
}
