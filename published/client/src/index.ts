import { contract } from '@repo/api';
import { createORPCClient } from '@orpc/client';
import type {
  ContractRouterClient,
  InferContractRouterInputs,
  InferContractRouterOutputs,
} from '@orpc/contract';
import { OpenAPILink } from '@orpc/openapi-client/fetch';

import { DEFAULT_ORIGIN } from './content';

export { isDefinedError, safe } from '@orpc/client';
export type { ContentEntry, ContentType, Organization } from '@repo/api';

export { entryTypeName, fetchContentModel, renderContentModule } from './codegen';
export type { ContentModel } from './codegen';

export { assetUrl, createContentClient, DEFAULT_ORIGIN, resolveAssetPaths } from './content';
export type {
  CollectionClient,
  ContentAsset,
  ContentClient,
  ContentClientOptions,
  ContentEntryBase,
  ContentModelShape,
  ContentReference,
  MapClient,
} from './content';

export type ApiInputs = InferContractRouterInputs<typeof contract>;
export type ApiOutputs = InferContractRouterOutputs<typeof contract>;

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
