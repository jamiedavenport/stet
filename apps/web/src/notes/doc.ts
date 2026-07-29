import * as Y from 'yjs';

/** The Yjs root the Tiptap Collaboration extension is configured with. */
const notesField = 'notes';

// The room the shared note lives in. Rooms are per page, so this is the route
// the editor is mounted on, named here because the server reads the same room
// with no route to ask.
export const notesPage = '/app/notes';

// The editor's content lives in an XmlFragment of ProseMirror nodes. Reading
// it needs nothing but yjs, so the same accessor works on a live room's doc
// and on one rehydrated from the database by @repo/realtime/document.
export function getNotesFragment(doc: Y.Doc): Y.XmlFragment {
  return doc.getXmlFragment(notesField);
}

/**
 * The note as plain text, one line per top-level block. Enough for a preview,
 * a word count, or a search index; rendering it back as rich text is the
 * editor's job, and needs the Tiptap schema this deliberately avoids.
 */
export function notesText(fragment: Y.XmlFragment): string {
  return fragment
    .toArray()
    .map((node) => nodeText(node))
    .join('\n')
    .trim();
}

export function countWords(text: string): number {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

function nodeText(node: Y.XmlElement | Y.XmlFragment | Y.XmlText | Y.XmlHook): string {
  if (node instanceof Y.XmlText) {
    // Formatting arrives as delta attributes, so the inserts alone are the
    // text; toString() would render the marks back as tags.
    return node
      .toDelta()
      .map((op: { insert?: unknown }) => (typeof op.insert === 'string' ? op.insert : ''))
      .join('');
  }
  if (node instanceof Y.XmlElement || node instanceof Y.XmlFragment) {
    return node
      .toArray()
      .map((child) => nodeText(child))
      .join('');
  }
  return '';
}
