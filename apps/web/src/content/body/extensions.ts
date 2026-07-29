import type { Extensions } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import Typography from '@tiptap/extension-typography';
import StarterKit from '@tiptap/starter-kit';

/**
 * The schema a rich text body speaks: everything here has a markdown
 * rendering. The API serializes bodies with exactly this list, so an
 * extension the renderer does not know (task lists, mentions) would reach
 * customers as raw HTML embedded in their markdown, and must not be added
 * without teaching `renderToMarkdown` about it first.
 *
 * Editor-only extensions live in `editor-extensions.ts` instead: this module
 * is loaded by the worker to serialize bodies, so it stays free of anything
 * that reaches for React or the DOM.
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
