import type { ToolSet } from 'ai';

import { contentReadTools } from './read';
import { contentWriteTools } from './write';

/**
 * Every tool the assistant can call, scoped to one organization. The chat
 * agent and the MCP server both serve exactly this set, so a capability
 * added here reaches every surface at once.
 */
export function contentTools(organizationId: string): ToolSet {
  return { ...contentReadTools(organizationId), ...contentWriteTools(organizationId) };
}
