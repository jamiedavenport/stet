import type * as Y from 'yjs';

/**
 * The realtime room an entry's rich text bodies live in. Keyed by entry id,
 * not route, so renaming a slug (or its collection) never orphans the
 * document. The public API reads the same room through
 * `loadDocument({ organizationId, page: entryPage(id) })`.
 */
export function entryPage(entryId: string): string {
  return `/entry/${entryId}`;
}

/** The Yjs root one rich text field's body lives under. */
export function bodyField(fieldKey: string): string {
  return `body:${fieldKey}`;
}

/**
 * One body per rich text field, each its own root in the entry's document.
 * The same accessor works on a live room's doc and on one rehydrated from
 * the database.
 */
export function bodyFragment(doc: Y.Doc, fieldKey: string): Y.XmlFragment {
  return doc.getXmlFragment(bodyField(fieldKey));
}
