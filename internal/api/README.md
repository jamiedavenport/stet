# @repo/api

The public HTTP API contract: [oRPC](https://orpc.dev) procedures defined with Zod schemas and REST route metadata.

The contract is the single source of truth:

- `apps/web` implements it with `@orpc/server` and serves it as plain REST under `/api/v1`.
- `published/client` wraps it in the fully typed `@stetcms/client`.
- `pnpm build` regenerates `openapi.json`, an OpenAPI 3.1 document for documentation tooling.

Authentication is organization API keys only, sent as `x-api-key`. Session cookies and bearer tokens are not accepted, so every endpoint is scoped to exactly one organization.
