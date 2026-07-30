import { describe, expect, it } from 'vite-plus/test';

import { assetUrl, createContentClient, resolveAssetPaths } from './content';

const origin = 'https://stet.example.com';

type Model = {
  posts: {
    kind: 'collection';
    entry: {
      id: string;
      slug: string;
      title: string;
      createdAt: string;
      updatedAt: string;
      fields: { cover?: { id: string; url: string } | null };
    };
  };
};

/** A fetch that answers every call with the given payload. */
function stubFetch(payload: unknown) {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as ReturnType<typeof globalThis.fetch>;
}

function entry(fields: Record<string, unknown>) {
  return {
    id: 'entry-1',
    slug: 'hello-world',
    title: 'Hello World',
    fields,
    createdAt: '2026-07-30T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
  };
}

describe('assetUrl', () => {
  it('joins an asset path to the origin', () => {
    expect(assetUrl('/assets/abc', origin)).toBe('https://stet.example.com/assets/abc');
  });

  it('leaves a whole URL alone', () => {
    const absolute = 'https://cdn.example.com/assets/abc';
    expect(assetUrl(absolute, origin)).toBe(absolute);
  });

  it('leaves paths that are not assets alone', () => {
    expect(assetUrl('/api/files/abc', origin)).toBe('/api/files/abc');
  });
});

describe('resolveAssetPaths', () => {
  it('resolves a markdown image', () => {
    expect(resolveAssetPaths('Before\n\n![A cover](/assets/abc)\n\nAfter', origin)).toBe(
      'Before\n\n![A cover](https://stet.example.com/assets/abc)\n\nAfter',
    );
  });

  it('resolves a markdown link to an asset', () => {
    expect(resolveAssetPaths('[the report](/assets/abc)', origin)).toBe(
      '[the report](https://stet.example.com/assets/abc)',
    );
  });

  it('resolves every image in a body, not just the first', () => {
    const out = resolveAssetPaths('![one](/assets/a)\n\n![two](/assets/b)', origin);
    expect(out).toBe(`![one](${origin}/assets/a)\n\n![two](${origin}/assets/b)`);
  });

  it('resolves the src of raw HTML a body carries', () => {
    expect(resolveAssetPaths('<img src="/assets/abc">', origin)).toBe(
      '<img src="https://stet.example.com/assets/abc">',
    );
  });

  it('leaves other links alone', () => {
    const text = '[docs](/docs/getting-started) and [home](https://example.com)';
    expect(resolveAssetPaths(text, origin)).toBe(text);
  });

  it('leaves prose that merely mentions the path alone', () => {
    const text = 'Assets are served from /assets/<id>, which needs no key.';
    expect(resolveAssetPaths(text, origin)).toBe(text);
  });
});

describe('createContentClient asset resolution', () => {
  it('resolves an asset field against the configured origin', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: stubFetch(entry({ cover: { id: 'asset-1', url: '/assets/asset-1' } })),
    });

    const post = await stet.posts.get('hello-world');
    expect(post.fields.cover?.url).toBe('https://stet.example.com/assets/asset-1');
  });

  it('resolves assets inside a list', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: stubFetch({
        type: { slug: 'posts', name: 'Posts', kind: 'collection', fields: [] },
        entries: [entry({ cover: { id: 'asset-1', url: '/assets/asset-1' } })],
      }),
    });

    const posts = await stet.posts.list();
    expect(posts[0].fields.cover?.url).toBe('https://stet.example.com/assets/asset-1');
  });

  it('leaves an entry without assets untouched', async () => {
    const payload = entry({ cover: null, summary: 'Morning' });
    const stet = createContentClient<Model>({ origin, fetch: stubFetch(payload) });

    expect(await stet.posts.get('hello-world')).toEqual(payload);
  });

  it('resolves images embedded in a rich text body', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: stubFetch(entry({ body: 'Intro\n\n![A cover](/assets/asset-1)\n\nOutro' })),
    });

    const post = (await stet.posts.get('hello-world')) as unknown as {
      fields: { body: string };
    };
    expect(post.fields.body).toBe(
      'Intro\n\n![A cover](https://stet.example.com/assets/asset-1)\n\nOutro',
    );
  });

  it('leaves the entry’s own metadata alone', async () => {
    const stet = createContentClient<Model>({ origin, fetch: stubFetch(entry({})) });

    const post = await stet.posts.get('hello-world');
    expect(post.slug).toBe('hello-world');
    expect(post.createdAt).toBe('2026-07-30T00:00:00.000Z');
  });
});
