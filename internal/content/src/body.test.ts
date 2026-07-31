import { bodyFragment } from '@repo/realtime/entry';
import { prosemirrorJSONToYXmlFragment } from '@tiptap/y-tiptap';
import { describe, expect, it } from 'vite-plus/test';
import { Doc } from 'yjs';

import { bodyContent, bodyMarkdown, bodySchema, markdownToBody, setBodyMarkdown } from './body';

function roundTrip(markdown: string): string | null {
  const doc = new Doc();
  setBodyMarkdown(doc, 'body', markdown);
  return bodyMarkdown(doc, 'body');
}

function render(markdown: string) {
  const doc = new Doc();
  setBodyMarkdown(doc, 'body', markdown);
  return bodyContent(doc, 'body');
}

function renderJson(content: Parameters<typeof prosemirrorJSONToYXmlFragment>[1]) {
  const doc = new Doc();
  prosemirrorJSONToYXmlFragment(bodySchema, content, bodyFragment(doc, 'body'));
  return bodyContent(doc, 'body');
}

describe('body markdown round-trip', () => {
  it('parses markdown, fills a Yjs fragment, and serializes back', () => {
    const markdown =
      'Good coffee starts with **fresh beans** and clean water.\n\n' +
      'Brewing is a matter of ratio and patience:\n\n' +
      '- grind to match the method\n' +
      '- water just off the boil';

    const doc = new Doc();
    prosemirrorJSONToYXmlFragment(bodySchema, markdownToBody(markdown), bodyFragment(doc, 'body'));

    const out = bodyMarkdown(doc, 'body');
    expect(out).toContain('fresh beans');
    expect(out).toContain('ratio and patience');
    expect(out).toContain('- grind to match the method');
  });

  // Both of these reach for a DOM member zeed-dom does not have, so without
  // the shims in ./zeed-dom they throw rather than losing a little formatting.
  it('keeps a table', () => {
    const out = roundTrip('| Roast | Days |\n| --- | --- |\n| Filter | 7 |\n| Espresso | 14 |');

    expect(out).toContain('Roast');
    expect(out).toContain('Espresso');
    expect(out).toContain('14');
  });

  it('keeps a fenced code block and its language', () => {
    const out = roundTrip('Try it:\n\n```ts\nconst ratio = 1 / 16;\n```');

    expect(out).toContain('```ts');
    expect(out).toContain('const ratio = 1 / 16;');
  });

  it('renders canonical markdown and HTML from the same body', () => {
    const out = render(
      'Fresh **beans**.\n\n[Read more](https://example.com)\n\n![Cover](/assets/asset-1)',
    );

    expect(out?.markdown).toContain('**beans**');
    expect(out?.html).toContain('<strong>beans</strong>');
    expect(out?.html).toContain('class="body-link"');
    expect(out?.html).toContain('href="https://example.com"');
    expect(out?.html).toContain('src="/assets/asset-1"');
    expect(out?.html).toContain('class="body-image"');
  });

  it('keeps table layout in HTML', () => {
    const out = render('| Roast | Days |\n| --- | ---: |\n| Filter | 7 |');

    expect(out?.html).toContain('<table style="min-width: 50px">');
    expect(out?.html).toContain('<col style="min-width: 25px">');
    expect(out?.html).toContain('<th colspan="1" rowspan="1" style="text-align: right">');
  });

  it('keeps every schema mark in HTML', () => {
    for (const markName of Object.keys(bodySchema.marks)) {
      const mark: { type: string; attrs?: Record<string, string> } = { type: markName };
      if (markName === 'link') {
        mark.attrs = { href: 'https://example.com' };
      }

      const out = renderJson({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: markName, marks: [mark] }],
          },
        ],
      });

      expect(out?.html, markName).not.toBe(`<p>${markName}</p>`);
    }
  });

  it('adds a safe rel to links that open a new tab', () => {
    const out = renderJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'link',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'https://example.com', rel: null, target: '_blank' },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(out?.html).toContain('target="_blank"');
    expect(out?.html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('strips unsafe image URLs from HTML', () => {
    const out = renderJson({
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'javascript:alert(2)', alt: 'bad image' } }],
    });

    expect(out?.html).not.toContain('javascript:');
    expect(out?.html).toContain('alt="bad image"');
  });
});
