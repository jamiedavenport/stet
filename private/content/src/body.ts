import { bodyFragment } from '@repo/realtime/entry';
import { getSchema } from '@tiptap/core';
import type { Extensions, JSONContent } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import Typography from '@tiptap/extension-typography';
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown';
import StarterKit from '@tiptap/starter-kit';
import { yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';
import { marked } from 'marked';
import { parseHTML } from 'zeed-dom';
import type { Doc } from 'yjs';

/**
 * The schema a rich text body speaks: everything here has a markdown
 * rendering. The API serializes bodies with exactly this list, so an
 * extension the renderer does not know (task lists, mentions) would reach
 * customers as raw HTML embedded in their markdown, and must not be added
 * without teaching `renderToMarkdown` about it first.
 *
 * Editor-only extensions live in the app's `editor-extensions.ts` instead:
 * this module is loaded by the worker to serialize bodies, so it stays free
 * of anything that reaches for React or the DOM.
 */
export function bodySchemaExtensions(): Extensions {
  return [
    StarterKit.configure({
      // Collaboration ships its own Yjs-aware history handling.
      undoRedo: false,
      link: { openOnClick: false, HTMLAttributes: { class: 'body-link' } },
    }),
    Typography,
    TableKit.configure({ table: { resizable: true } }),
    Image.configure({ HTMLAttributes: { class: 'body-image' } }),
  ];
}

const extensions = bodySchemaExtensions();

/** The ProseMirror schema of the extension list, for Yjs conversions. */
export const bodySchema = getSchema(extensions);

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
  const node = yXmlFragmentToProseMirrorRootNode(fragment, bodySchema);
  return renderToMarkdown({ extensions, content: node });
}

/**
 * Markdown parsed into body content, the inverse of `bodyMarkdown`. Goes
 * through HTML because ProseMirror parses HTML; the DOM it parses from is
 * zeed-dom's, which is plain JavaScript and so runs in the worker as well as
 * the browser (TipTap's own server parser needs happy-dom, which wants
 * `node:vm` and dies in workerd).
 */
export function markdownToBody(markdown: string): JSONContent {
  const html = marked.parse(markdown, { async: false });
  const dom = parseHTML(html) as unknown as Node;
  return ProseMirrorDOMParser.fromSchema(bodySchema).parse(dom).toJSON() as JSONContent;
}
