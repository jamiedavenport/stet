import type { Actor } from '@repo/audit';
import type { ToolSet } from 'ai';

import { contentReadTools } from './read';
import { contentWriteTools } from './write';

/**
 * Every tool the assistant can call, scoped to one organization. The chat
 * agent and the MCP server both serve exactly this set, so a capability
 * added here reaches every surface at once. `userId` is the person whose
 * session the tools run under; their changes are attributed to them, through
 * the assistant.
 */
export function contentTools(organizationId: string, userId: string): ToolSet {
  const actor: Actor = { userId, via: 'ai' };
  return { ...contentReadTools(organizationId), ...contentWriteTools(organizationId, actor) };
}
