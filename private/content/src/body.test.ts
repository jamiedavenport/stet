import { bodyFragment } from '@repo/realtime/entry';
import { prosemirrorJSONToYXmlFragment } from '@tiptap/y-tiptap';
import { describe, expect, it } from 'vite-plus/test';
import { Doc } from 'yjs';

import { bodyMarkdown, bodySchema, markdownToBody } from './body';

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
});
