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

  it('resolves assets in both representations of a rich text body', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: stubFetch(
        entry({
          body: {
            markdown: '![A cover](/assets/asset-1)\n\n[Report](/assets/asset-2)',
            html: '<img src="/assets/asset-1"><a href="/assets/asset-2">Report</a>',
          },
        }),
      ),
    });

    const post = (await stet.posts.get('hello-world')) as unknown as {
      fields: { body: { markdown: string; html: string } };
    };
    expect(post.fields.body.markdown).toBe(
      '![A cover](https://stet.example.com/assets/asset-1)\n\n' +
        '[Report](https://stet.example.com/assets/asset-2)',
    );
    expect(post.fields.body.html).toBe(
      '<img src="https://stet.example.com/assets/asset-1">' +
        '<a href="https://stet.example.com/assets/asset-2">Report</a>',
    );
  });

  it('leaves the entry’s own metadata alone', async () => {
    const stet = createContentClient<Model>({ origin, fetch: stubFetch(entry({})) });

    const post = await stet.posts.get('hello-world');
    expect(post.slug).toBe('hello-world');
    expect(post.createdAt).toBe('2026-07-30T00:00:00.000Z');
  });
});

/** A fetch that answers every call with a non-ok response carrying `body`. */
function errorFetch(status: number, body: unknown, kind: 'json' | 'text' = 'json') {
  return () =>
    Promise.resolve(
      new Response(kind === 'json' ? JSON.stringify(body) : String(body), {
        status,
        headers: kind === 'json' ? { 'Content-Type': 'application/json' } : {},
      }),
    ) as unknown as ReturnType<typeof globalThis.fetch>;
}

/** The wire shape of an oRPC error body, as the API serializes it. */
function orpcError(code: string, status: number, message: string) {
  return { defined: true, code, status, message };
}

describe('createContentClient error handling', () => {
  /** Awaits a rejection and returns the thrown error, or fails if none is thrown. */
  async function rejection(promise: Promise<unknown>): Promise<Error> {
    try {
      await promise;
    } catch (error) {
      return error as Error;
    }
    throw new Error('Expected the request to reject, but it resolved.');
  }

  it('surfaces the API error message alongside the status', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: errorFetch(
        401,
        orpcError(
          'UNAUTHORIZED',
          401,
          'Authentication required. Pass an organization API key in the `x-api-key` header.',
        ),
      ),
    });

    const error = await rejection(stet.posts.get('hello-world'));
    expect(error.message).toContain('401');
    expect(error.message).toContain('Authentication required');
  });

  it('surfaces the message when listing a collection fails', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: errorFetch(
        429,
        orpcError('RATE_LIMITED', 429, 'Too many requests. Try again shortly.'),
      ),
    });

    const error = await rejection(stet.posts.list());
    expect(error.message).toContain('Too many requests. Try again shortly.');
  });

  it('falls back to the status-only message for a non-JSON body', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: errorFetch(502, '<html>Bad Gateway</html>', 'text'),
    });

    const error = await rejection(stet.posts.get('hello-world'));
    expect(error.message).toContain('502');
    expect(error.message).toContain('failed with status');
  });

  it('falls back to the status-only message for a JSON body that is not an oRPC error', async () => {
    const stet = createContentClient<Model>({
      origin,
      fetch: errorFetch(404, { error: 'Not found' }),
    });

    const error = await rejection(stet.posts.get('missing'));
    expect(error.message.endsWith('failed with status 404.')).toBe(true);
  });
});
