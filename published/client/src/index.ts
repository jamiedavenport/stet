import { contract } from '@repo/api';
import { createORPCClient } from '@orpc/client';
import type {
  ContractRouterClient,
  InferContractRouterInputs,
  InferContractRouterOutputs,
} from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';

export { isDefinedError, safe } from '@orpc/client';
export type { Organization } from '@repo/api';

export type ApiInputs = InferContractRouterInputs<typeof contract>;
export type ApiOutputs = InferContractRouterOutputs<typeof contract>;

// The hosted Stet deployment. Pass `origin` to target a local dev server or
// a self-hosted instance instead.
export const DEFAULT_ORIGIN = 'https://stet.jxd.dev';

export type StetClient = ContractRouterClient<typeof contract>;

export type StetClientOptions = {
  origin?: string;
  // Organization API key, sent as `x-api-key`. Created by an organization
  // member through the Better Auth api-key endpoints.
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
};

export function createStetClient(options: StetClientOptions = {}): StetClient {
  const origin = options.origin ?? DEFAULT_ORIGIN;

  const link = new OpenAPILink(contract, {
    url: `${origin}/api/v1`,
    headers: () => {
      if (options.apiKey === undefined) {
        return {};
      }
      return { 'x-api-key': options.apiKey };
    },
    fetch: options.fetch,
  });

  return createORPCClient(link);
}
