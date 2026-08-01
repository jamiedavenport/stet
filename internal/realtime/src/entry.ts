import { XmlElement, XmlText } from 'yjs';
import type { Doc, XmlFragment } from 'yjs';

// A content entry's rich text bodies live in the entry's collaborative
// document. These helpers are the one home of that convention: the editor,
// the public API, the search mirror, and the AI tools all address bodies
// through them.

/**
 * The realtime room an entry's rich text bodies live in. Keyed by entry id,
 * not route, so renaming a slug (or its collection) never orphans the
 * document. Anything outside a session reads the same room through
 * `loadDocument({ organizationId, page: entryPage(id) })`.
 */
export function entryPage(entryId: string): string {
  return `/entry/${entryId}`;
}

/** The entry an `/entry/…` page belongs to, or null for any other page. */
export function entryIdFromPage(page: string): string | null {
  if (!page.startsWith('/entry/')) {
    return null;
  }
  const id = page.slice('/entry/'.length);
  return id.length === 0 ? null : id;
}

/** The Yjs root one rich text field's body lives under. */
export function bodyField(fieldId: string): string {
  return `body:${fieldId}`;
}

/**
 * One body per rich text field, each its own root in the entry's document.
 * The same accessor works on a live room's doc and on one rehydrated from
 * the database.
 */
export function bodyFragment(doc: Doc, fieldId: string): XmlFragment {
  return doc.getXmlFragment(bodyField(fieldId));
}

/**
 * The plain text of every body in the document, for the search index. Walks
 * the Yjs tree directly rather than the editor schema, so it needs no TipTap
 * and tolerates nodes a newer schema no longer knows.
 */
export function documentBodyText(doc: Doc): string {
  const parts: string[] = [];
  for (const key of doc.share.keys()) {
    if (key.startsWith('body:')) {
      collectText(doc.getXmlFragment(key), parts);
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function collectText(parent: XmlFragment, parts: string[]): void {
  for (const node of parent.toArray()) {
    if (node instanceof XmlText) {
      // toString() would serialize formatting as tags; the delta's inserts
      // are the text alone.
      for (const op of node.toDelta() as { insert?: unknown }[]) {
        if (typeof op.insert === 'string') {
          parts.push(op.insert);
        }
      }
    } else if (node instanceof XmlElement) {
      collectText(node, parts);
    }
  }
}
