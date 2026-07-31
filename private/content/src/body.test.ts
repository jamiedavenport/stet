import { bodyFragment } from '@repo/realtime/entry';
import { prosemirrorJSONToYXmlFragment } from '@tiptap/y-tiptap';
import { describe, expect, it } from 'vite-plus/test';
import { Doc } from 'yjs';

import { bodyMarkdown, bodySchema, markdownToBody, setBodyMarkdown } from './body';

function roundTrip(markdown: string): string | null {
  const doc = new Doc();
  setBodyMarkdown(doc, 'body', markdown);
  return bodyMarkdown(doc, 'body');
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
});
