import { createOpenAPI } from 'fumadocs-openapi/server';

// Imported (not read from disk) so the spec is bundled into the Worker,
// which has no filesystem at runtime. The file is generated from the oRPC
// contract by `pnpm generate:openapi` in private/api, so the reference
// always matches the published contract.
import spec from '@repo/api/openapi.json';

type OpenAPIInput = NonNullable<NonNullable<Parameters<typeof createOpenAPI>[0]>['input']>;
type OpenAPIDocument = Extract<OpenAPIInput, Record<string, unknown>>[string];

export const openapi = createOpenAPI({
  input: { api: spec as Extract<OpenAPIDocument, object> },
});
