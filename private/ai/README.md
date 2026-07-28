# @repo/ai

AI integration on the Cloudflare Agents SDK and the AI SDK.

- `./agents`: agent definitions as plain data (id, instructions, tools). The shipped `chat` agent powers the in-app assistant; add an agent by adding a definition here plus a Worker binding.
- `./server`: the `ChatAgent` Durable Object that runs a definition (binding `CHAT_AGENT` in `apps/web/wrangler.jsonc`). Instances are named `organizationId:userId`, so each user has their own conversation per organization.
- `./model`: the Anthropic model configuration (needs `ANTHROPIC_API_KEY`).
- `./client`: the client-side chat wiring for the web app.
