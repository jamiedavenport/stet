import { createORPCErrorFromJson, isORPCErrorJson } from '@orpc/client';

import { DEFAULT_ORIGIN } from './codegen';

export { DEFAULT_ORIGIN };

/** Fields every entry carries, whatever its collection's shape. */
export type ContentEntryBase = {
  id: string;
  slug: string;
  title: string;
  /** ISO 8601. */
  createdAt: string;
  updatedAt: string;
};

/**
 * What a reference field holds: enough to render a link without a second
 * request, and the slug to fetch the whole entry with the target
 * collection's `get()`. Which collection that is stands in the generated
 * field's doc comment.
 */
export type ContentReference = {
  id: string;
  slug: string;
  title: string;
};

/**
 * What an asset field holds. `url` is a fully-qualified, public URL: the API
 * returns it relative to itself and the client resolves it against the origin
 * it was configured with, so it can go straight into an `img` tag or a
 * download link on your own site, which is a different origin.
 */
export type ContentAsset = {
  id: string;
  url: string;
  /** The original filename. */
  name: string;
  contentType: string;
  /** Bytes. */
  size: number;
};

/** A rich text field rendered canonically by Stet from its editor document. */
export type ContentRichText = {
  markdown: string;
  html: string;
};

/**
 * The shape `@stetcms/vite` generates from the organization's content model:
 * one key per collection or map, carrying its kind and full entry type.
 */
export type ContentModelShape = Record<
  string,
  { kind: 'collection' | 'map'; entry: ContentEntryBase }
>;

export type CollectionClient<E extends ContentEntryBase> = {
  /** Every entry, oldest first. */
  list(): Promise<E[]>;
  /** One entry, addressed by its slug. */
  get(slug: string): Promise<E>;
};

export type MapClient<E extends ContentEntryBase> = {
  /** The map's single entry. */
  get(): Promise<E>;
};

export type ContentClient<M extends ContentModelShape> = {
  [K in keyof M]: M[K] extends { kind: 'map' }
    ? MapClient<M[K]['entry']>
    : CollectionClient<M[K]['entry']>;
};

export type ContentClientOptions = {
  origin?: string;
  /**
   * Organization API key, sent as `x-api-key`. Content is served to servers:
   * keep the key out of browser bundles and call from your own backend.
   */
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
};

/** The path the API serves public content assets from. */
const assetPath = '/assets/';

/**
 * Joins an asset path to the Stet origin. Anything already absolute is left
 * alone, so a future API that returns whole URLs needs no change here.
 */
export function assetUrl(url: string, origin: string): string {
  return url.startsWith(assetPath) ? `${origin}${url}` : url;
}

// Asset paths inside rich text: markdown destinations and HTML sources or
// links. Only Stet asset paths are joined; other relative links stay local to
// the customer's site.
const assetPathInText = /(\]\(|\s(?:src|href)=["'])(\/assets\/)/g;

/**
 * The same join applied inside a body's markdown or HTML, so an asset an
 * editor embedded or linked renders on your site as readily as an asset field.
 */
export function resolveAssetPaths(text: string, origin: string): string {
  return text.replace(
    assetPathInText,
    (_match, prefix: string) => `${prefix}${origin}${assetPath}`,
  );
}

/**
 * Rewrites every asset URL in a response to a whole URL: an asset field's
 * value, and the images an editor dropped into a rich text body.
 *
 * The API returns them relative to itself, because it is the same bytes
 * whichever origin serves them and baking one in would pin stored content to
 * a domain. Your site is a different origin, so a relative path would resolve
 * against yours; the client owns the join because the origin is exactly what
 * it was configured with.
 */
function resolveAssetUrls(payload: unknown, origin: string): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => resolveAssetUrls(item, origin));
  }
  if (typeof payload !== 'object' || payload === null) {
    return payload;
  }
  const entries = Object.entries(payload as Record<string, unknown>).map(([key, value]) => {
    if (typeof value === 'string') {
      // An asset field's whole value, or a body's embedded ones. The two
      // patterns cannot both match a given string, so the order is arbitrary.
      return [key, key === 'url' ? assetUrl(value, origin) : resolveAssetPaths(value, origin)];
    }
    return [key, resolveAssetUrls(value, origin)];
  });
  return Object.fromEntries(entries);
}

/**
 * The human message a failed request carries, if any. The API answers an error
 * with an oRPC error body: a JSON object carrying the `message` the contract
 * writes for a person (`UNAUTHORIZED` explains the missing `x-api-key` header;
 * `QUOTA_EXCEEDED`, `RATE_LIMITED` and `NOT_FOUND` each say what happened).
 * Surfacing it turns a bare status code into a sentence that names the cause.
 *
 * The body is validated and read with oRPC's own `isORPCErrorJson` /
 * `createORPCErrorFromJson`, so the shape check and the `code`-based message
 * fallback match the server rather than being reimplemented here.
 *
 * Returns `undefined` when the body is empty, not JSON, or not an oRPC error
 * (a proxy's HTML error page, say), so the caller keeps the status-only message.
 */
async function errorMessage(response: Response): Promise<string | undefined> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    // Empty or non-JSON body — the status-only message is the best we have.
    return undefined;
  }
  return isORPCErrorJson(body) ? createORPCErrorFromJson(body).message : undefined;
}

/**
 * The model-shaped client `stet.gen.ts` instantiates: `stet.posts.list()`,
 * `stet.posts.get('hello-world')`, `stet.landing.get()`. The type parameter
 * narrows which keys exist and what their entries look like; the runtime is
 * one Proxy over the content API.
 */
export function createContentClient<M extends ContentModelShape>(
  options: ContentClientOptions = {},
): ContentClient<M> {
  const origin = options.origin ?? DEFAULT_ORIGIN;

  const request = async (path: string): Promise<unknown> => {
    const fetcher = options.fetch ?? globalThis.fetch;
    const response = await fetcher(`${origin}/api/v1${path}`, {
      headers: options.apiKey === undefined ? {} : { 'x-api-key': options.apiKey },
    });
    if (!response.ok) {
      const summary = `Stet request ${path} failed with status ${response.status}.`;
      const detail = await errorMessage(response);
      throw new Error(detail === undefined ? summary : `${summary} ${detail}`);
    }
    return resolveAssetUrls(await response.json(), origin);
  };

  const listEntries = async (slug: string): Promise<unknown[]> => {
    const data = (await request(`/content/${encodeURIComponent(slug)}`)) as {
      entries: unknown[];
    };
    return data.entries;
  };

  const clientFor = (slug: string) => ({
    list: () => listEntries(slug),
    get: async (entrySlug?: string) => {
      if (entrySlug !== undefined) {
        return request(`/content/${encodeURIComponent(slug)}/${encodeURIComponent(entrySlug)}`);
      }
      const [entry] = await listEntries(slug);
      if (entry === undefined) {
        throw new Error(`Map "${slug}" has no entry.`);
      }
      return entry;
    },
  });

  return new Proxy(
    {},
    {
      get: (_target, property) => {
        // Symbols and thenable probes reach the proxy too (e.g. `await stet`);
        // only model keys resolve to clients.
        if (typeof property !== 'string' || property === 'then') {
          return undefined;
        }
        return clientFor(property);
      },
    },
  ) as ContentClient<M>;
}
