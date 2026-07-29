import { getSchema } from '@tiptap/core';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown';
import { yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';
import type { Doc } from 'yjs';

import { bodySchemaExtensions } from '#/content/body/extensions';
import { bodyFragment } from '#/content/body/doc';

const extensions = bodySchemaExtensions();
const schema = getSchema(extensions);

/**
 * A body's markdown as last saved by the realtime room, or null if it was
 * never written. Serialized with the same extension list the editor runs, so
 * the schema always matches what was typed.
 */
export function bodyMarkdown(doc: Doc, fieldKey: string): string | null {
  const fragment = bodyFragment(doc, fieldKey);
  if (fragment.length === 0) {
    return null;
  }
  const node = yXmlFragmentToProseMirrorRootNode(fragment, schema);
  return renderToMarkdown({ extensions, content: node });
}
