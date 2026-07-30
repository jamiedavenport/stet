import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tool, ToolCallOptions } from 'ai';
import type { z } from 'zod';

import { contentTools } from './tools/index';

/**
 * The assistant's tool set served over MCP, one server per authenticated
 * request. Approval semantics differ by surface: in chat, `needsApproval`
 * pauses on an in-app card; over MCP the connecting client owns
 * confirmation, so tools execute directly once the worker has verified the
 * OAuth token, the organization, and the plan.
 */
export function createContentMcpServer(organizationId: string, userId: string): McpServer {
  const server = new McpServer({ name: 'stet', version: '1.0.0' });
  for (const [name, definition] of Object.entries(contentTools(organizationId, userId))) {
    register(server, name, definition);
  }
  return server;
}

function register(server: McpServer, name: string, definition: Tool): void {
  const execute = definition.execute;
  if (execute === undefined) {
    return;
  }
  server.registerTool(
    name,
    {
      description: definition.description,
      inputSchema: definition.inputSchema as z.ZodType<Record<string, unknown>>,
    },
    async (input: Record<string, unknown>) => {
      const options: ToolCallOptions = { toolCallId: crypto.randomUUID(), messages: [] };
      const result: unknown = await execute(input, options);
      const failed = typeof result === 'object' && result !== null && 'error' in result;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        isError: failed ? true : undefined,
      };
    },
  );
}
