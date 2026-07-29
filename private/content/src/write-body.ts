import { updateDocument } from '@repo/realtime/document';
import { bodyFragment, entryPage } from '@repo/realtime/entry';
import { prosemirrorJSONToYXmlFragment } from '@tiptap/y-tiptap';

import { bodyMarkdown, bodySchema, markdownToBody } from './body';

export type WriteBodyMode = 'replace' | 'append';

/**
 * Writes a rich text body from markdown, through the entry's realtime room:
 * anyone with the entry open sees the change stream in live, and the room's
 * flush mirrors it to D1 for the API and the search index.
 *
 * Append re-serializes the existing body and re-parses the concatenation,
 * rather than splicing Yjs nodes, so the result is always exactly what the
 * markdown round-trip produces.
 */
export async function writeEntryBody(options: {
  organizationId: string;
  entryId: string;
  fieldKey: string;
  markdown: string;
  mode?: WriteBodyMode;
}): Promise<void> {
  const room = { organizationId: options.organizationId, page: entryPage(options.entryId) };
  await updateDocument(room, (doc) => {
    let markdown = options.markdown;
    if (options.mode === 'append') {
      const existing = bodyMarkdown(doc, options.fieldKey);
      if (existing !== null && existing.trim().length > 0) {
        markdown = `${existing.trimEnd()}\n\n${options.markdown}`;
      }
    }
    const fragment = bodyFragment(doc, options.fieldKey);
    fragment.delete(0, fragment.length);
    prosemirrorJSONToYXmlFragment(bodySchema, markdownToBody(markdown), fragment);
  });
}
