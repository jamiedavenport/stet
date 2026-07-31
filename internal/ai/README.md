# @repo/ai

The assistant: agent plumbing on the Cloudflare Agents SDK and the AI SDK, plus the tool registry every AI surface serves.

- `./server`: the `ChatAgent` Durable Object (binding `CHAT_AGENT` in `apps/web/wrangler.jsonc`). Instances are named `organizationId:userId` — the worker enforces the name, and it is what scopes every tool call. Tools marked `needsApproval` pause the stream until the user answers the approval card in the chat.
- `src/tools/`: the tool registry over `@repo/content`: reads (model, entries, bodies as markdown, search) and approval-gated writes (schema, entries, `writeBody` through the live room). The chat agent and the MCP server serve exactly this set.
- `./mcp`: `createContentMcpServer(organizationId)`, the same tools as an MCP server. The worker authenticates requests with the Better Auth `mcp` plugin's OAuth tokens and serves it at `/mcp` (see `apps/web/src/server.ts`).
- `./model`: model selection (needs `ANTHROPIC_API_KEY`): `createChatModel` for conversations, `createFastModel` for latency-bound work like editor rewrites.
- `./client`: `useChatAgent` for connecting the chat UI, plus the tool-part helpers it renders with.
