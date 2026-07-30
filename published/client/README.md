# @stetcms/client

Typed client for the [Stet](https://github.com/jamiedavenport/stet) API. The types come straight from the oRPC contract the server implements, so calls and responses are fully typed end to end.

It also carries the content client runtime that [`@stetcms/vite`](https://github.com/jamiedavenport/stet/tree/main/published/vite)'s generated `stet.gen.ts` instantiates:

```ts
import { createContentClient } from '@stetcms/client';

// Generated code passes a model type here, so `stet.posts` autocompletes and
// each entry's `fields` match the model marketing built.
const stet = createContentClient<Model>({ apiKey: process.env.STET_API_KEY });

const posts = await stet.posts.list();
const post = await stet.posts.get('hello-world');
const landing = await stet.landing.get(); // a map: one entry, no slug
```

Rich text fields arrive as markdown, selects as option names, person fields as `{ id, name }`, assets as `{ id, url, name, contentType, size }` whose `url` needs no key, and references as `{ id, slug, title }` (an array for multi-reference). Keep the API key server-side: fetch content from loaders, server functions, or your own backend rather than the browser.

## Install

```bash
npm install @stetcms/client
```

## Usage

```ts
import { createStetClient, safe } from '@stetcms/client';

const client = createStetClient({
  apiKey: process.env.STET_API_KEY, // organization API key (stet_...)
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

Apache-2.0
