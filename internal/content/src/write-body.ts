import { updateDocument } from '@repo/realtime/document';
import { bodyFragment, entryPage } from '@repo/realtime/entry';
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';

import { bodyMarkdown, bodySchema, setBodyMarkdown } from './body';

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
    setBodyMarkdown(doc, options.fieldKey, markdown);
  });
}

/**
 * Moves a body to another field key, so renaming a field takes what was
 * written with it. Goes through ProseMirror rather than markdown: a rename
 * must not put the body through a round trip that only keeps what markdown
 * can say.
 */
export async function moveEntryBody(options: {
  organizationId: string;
  entryId: string;
  from: string;
  to: string;
}): Promise<void> {
  const room = { organizationId: options.organizationId, page: entryPage(options.entryId) };
  await updateDocument(room, (doc) => {
    const source = bodyFragment(doc, options.from);
    if (source.length === 0) {
      return;
    }
    const content = yXmlFragmentToProseMirrorRootNode(source, bodySchema).toJSON();
    source.delete(0, source.length);
    const target = bodyFragment(doc, options.to);
    target.delete(0, target.length);
    prosemirrorJSONToYXmlFragment(bodySchema, content, target);
  });
}
