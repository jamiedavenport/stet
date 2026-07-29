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
      throw new Error(`Stet request ${path} failed with status ${response.status}.`);
    }
    return response.json();
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
