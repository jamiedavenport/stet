# @jxdltd/onyx-client

Typed client for the [Onyx](https://github.com/jamiedavenport/onyx) API. The types come straight from the oRPC contract the server implements, so calls and responses are fully typed end to end.

## Install

```bash
npm install @jxdltd/onyx-client
```

## Usage

```ts
import { createOnyxClient, safe } from '@jxdltd/onyx-client';

const client = createOnyxClient({
  apiKey: process.env.ONYX_API_KEY, // organization API key (onyx_...)
});

const health = await client.health();

const { data: organization, error } = await safe(client.org.current());
if (error === null) {
  console.log(organization.name);
}

const { data: billing } = await safe(client.org.billing());
if (billing !== undefined) {
  // usage rows report each measured feature: { feature, used, cap, window }.
  console.log(billing.plan, billing.usage);
}
```

API keys are owned by an organization: an org member creates one through the Better Auth api-key endpoints (`POST /api/auth/api-key/create` with `organizationId`), and every API call made with that key is scoped to that organization.

Options:

- `origin`: target a local dev server or self-hosted instance (defaults to the hosted deployment).
- `apiKey`: organization API key sent as `x-api-key`.
- `fetch`: custom fetch implementation.

The API itself is plain REST under `/api/v1`, described by the OpenAPI document generated from the same contract.

## License

MIT
