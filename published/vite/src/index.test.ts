import { EventEmitter } from 'node:events';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { entryTypeName, renderContentModule } from '@stetcms/client/codegen';
import type { ContentModel } from '@stetcms/client/codegen';
import { build } from 'vite';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { stet } from './index';

const model: ContentModel = {
  types: [
    {
      slug: 'posts',
      name: 'Posts',
      kind: 'collection',
      fields: [
        { key: 'summary', name: 'Summary', type: 'text', options: [] },
        { key: 'body', name: 'Body', type: 'rich_text', options: [] },
        { key: 'reading_time', name: 'Reading time', type: 'number', options: [] },
        { key: 'featured', name: 'Featured', type: 'checkbox', options: [] },
        { key: 'author', name: 'Author', type: 'person', options: [] },
        {
          key: 'status',
          name: 'Status',
          type: 'select',
          options: [{ name: 'Draft' }, { name: 'Live' }],
        },
        {
          key: 'tags',
          name: 'Tags',
          type: 'multi_select',
          options: [{ name: 'News' }],
        },
        { key: 'cover', name: 'Cover', type: 'asset', options: [] },
        {
          key: 'written_by',
          name: 'Written by',
          type: 'reference',
          options: [],
          collection: 'authors',
        },
        {
          key: 'related',
          name: 'Related',
          type: 'multi_reference',
          options: [],
          collection: 'posts',
        },
      ],
    },
    { slug: 'authors', name: 'Authors', kind: 'collection', fields: [] },
    { slug: 'landing', name: 'Landing', kind: 'map', fields: [] },
  ],
};

describe('renderContentModule', () => {
  const code = renderContentModule(model, 'http://localhost:3000');

  it('emits one entry type per content type', () => {
    expect(code).toContain('export type PostsEntry = ContentEntryBase & {');
    expect(code).toContain('export type LandingEntry = ContentEntryBase & {');
  });

  it('maps field types to TypeScript', () => {
    expect(code).toContain('"summary"?: string | null;');
    expect(code).toContain('"body"?: string | null;');
    expect(code).toContain('"reading_time"?: number | null;');
    expect(code).toContain('"featured"?: boolean | null;');
    expect(code).toContain('"author"?: { id: string; name: string } | null;');
    expect(code).toContain('"status"?: "Draft" | "Live" | null;');
    expect(code).toContain('"tags"?: ("News")[] | null;');
    expect(code).toContain('"cover"?: ContentAsset | null;');
    expect(code).toContain('"written_by"?: ContentReference | null;');
    expect(code).toContain('"related"?: ContentReference[] | null;');
  });

  it('names the collection a reference points at, which its type cannot', () => {
    expect(code).toContain('References into "posts": fetch with stet["posts"].get(slug).');
    expect(code).toContain('Reference into "authors": fetch with stet["authors"].get(slug).');
  });

  it('imports only the value types the model uses', () => {
    expect(code).toContain(
      "import type { ContentEntryBase, ContentAsset, ContentReference } from '@stetcms/client';",
    );
    const plain = renderContentModule(
      { types: [{ slug: 'notes', name: 'Notes', kind: 'collection', fields: [] }] },
      'http://localhost:3000',
    );
    expect(plain).toContain("import type { ContentEntryBase } from '@stetcms/client';");
  });

  it('keys the model by slug with the kind', () => {
    expect(code).toContain('"posts": { kind: "collection"; entry: PostsEntry };');
    expect(code).toContain('"landing": { kind: "map"; entry: LandingEntry };');
  });

  it('deprecates a deleted field instead of dropping it', () => {
    // The promise this keeps: a field deleted in the Stet UI reaches a running
    // dev server within seconds, and must not turn code that reads it into a
    // type error.
    const deleted = renderContentModule(
      {
        types: [
          {
            slug: 'posts',
            name: 'Posts',
            kind: 'collection',
            fields: [
              { key: 'summary', name: 'Summary', type: 'text', options: [] },
              {
                key: 'subtitle',
                name: 'Subtitle',
                type: 'text',
                options: [],
                deprecated: { at: '2026-03-12T09:41:00.000Z', by: 'Ada Lovelace' },
              },
            ],
          },
        ],
      },
      'http://localhost:3000',
    );

    expect(deleted).toContain('"subtitle"?: string | null;');
    expect(deleted).toContain(
      '/** @deprecated Deleted from the content model on 2026-03-12 by Ada Lovelace; ' +
        'entries still return the last value it held, until it is purged. */',
    );
    // Only the deleted one is marked.
    expect(deleted.split('@deprecated')).toHaveLength(2);
  });

  it('deprecates without an author when nobody signed in made the deletion', () => {
    const deleted = renderContentModule(
      {
        types: [
          {
            slug: 'posts',
            name: 'Posts',
            kind: 'collection',
            fields: [
              {
                key: 'subtitle',
                name: 'Subtitle',
                type: 'text',
                options: [],
                deprecated: { at: '2026-03-12T09:41:00.000Z' },
              },
            ],
          },
        ],
      },
      'http://localhost:3000',
    );

    expect(deleted).toContain(
      '/** @deprecated Deleted from the content model on 2026-03-12; ' +
        'entries still return the last value it held, until it is purged. */',
    );
  });

  it('keeps the reference doc when a reference field is deprecated', () => {
    const deleted = renderContentModule(
      {
        types: [
          {
            slug: 'posts',
            name: 'Posts',
            kind: 'collection',
            fields: [
              {
                key: 'written_by',
                name: 'Written by',
                type: 'reference',
                options: [],
                collection: 'authors',
                deprecated: { at: '2026-03-12T09:41:00.000Z', by: 'Ada Lovelace' },
              },
            ],
          },
        ],
      },
      'http://localhost:3000',
    );

    expect(deleted).toContain(
      '     * Reference into "authors": fetch with stet["authors"].get(slug).',
    );
    expect(deleted).toContain('     * @deprecated Deleted from the content model');
  });

  it('reads the origin and the key from the environment, never embedding a key', () => {
    // The generated origin is a fallback, not a target: one build artefact has
    // to work in every environment, and a stale file must not pin a deployment
    // to whatever origin it was last generated against.
    expect(code).toContain('process.env.STET_ORIGIN ?? "http://localhost:3000"');
    expect(code).toContain('process.env.STET_API_KEY');
    expect(code).not.toContain('stet_');
  });
});

describe('entryTypeName', () => {
  it('pascal-cases multi-part slugs', () => {
    expect(entryTypeName('case-studies')).toBe('CaseStudiesEntry');
  });

  it('never starts an identifier with a digit', () => {
    expect(entryTypeName('2024-goals')).toBe('Stet2024GoalsEntry');
  });
});

describe('stet plugin', () => {
  it('writes a fallback module and keeps building when no key is set', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stet-vite-'));

    await build({
      root,
      logLevel: 'silent',
      build: { write: false, minify: false, rollupOptions: { input: 'entry.js' } },
      plugins: [
        {
          name: 'test-entry',
          resolveId: (id) => (id === 'entry.js' ? id : undefined),
          load: (id) => (id === 'entry.js' ? 'console.log("entry");' : undefined),
        },
        stet({ apiKey: '' }),
      ],
    });

    const generated = await readFile(join(root, 'src/stet.gen.ts'), 'utf8');
    expect(generated).toContain('export type StetContentModel');
    expect(generated).toContain('createContentClient<StetContentModel>');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('regenerates while the dev server runs when the model changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stet-vite-'));
    const fetchModel = vi.fn(() => Promise.resolve(Response.json(model)));
    vi.stubGlobal('fetch', fetchModel);
    // Only the poll interval is faked; file IO and waitFor stay real.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    const plugin = stet({ apiKey: 'stet_test_key', origin: 'http://stet.local' });
    (plugin.configResolved as unknown as (config: unknown) => void)({ root });
    const httpServer = new EventEmitter();
    const server = { config: { logger: { info: vi.fn() } }, httpServer };
    (plugin.configureServer as unknown as (server: unknown) => void)(server);

    await vi.advanceTimersByTimeAsync(3100);
    await vi.waitFor(async () => {
      const generated = await readFile(join(root, 'src/stet.gen.ts'), 'utf8');
      expect(generated).toContain('"posts": { kind: "collection"; entry: PostsEntry };');
    });

    // A changed model rewrites the module on a later tick.
    const renamed: ContentModel = { types: [{ ...model.types[0], slug: 'articles' }] };
    fetchModel.mockImplementation(() => Promise.resolve(Response.json(renamed)));
    await vi.advanceTimersByTimeAsync(3100);
    await vi.waitFor(async () => {
      const generated = await readFile(join(root, 'src/stet.gen.ts'), 'utf8');
      expect(generated).toContain('"articles"');
    });

    httpServer.emit('close');
  });
});
