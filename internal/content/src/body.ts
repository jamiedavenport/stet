import { bodyFragment } from '@repo/realtime/entry';
import { getSchema } from '@tiptap/core';
import type { Extensions, JSONContent } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import Typography from '@tiptap/extension-typography';
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import { renderToMarkdown } from '@tiptap/static-renderer/pm/markdown';
import StarterKit from '@tiptap/starter-kit';
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProseMirrorRootNode } from '@tiptap/y-tiptap';
import { fromHtml } from 'hast-util-from-html';
import { defaultSchema, sanitize } from 'hast-util-sanitize';
import type { Schema } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';
import { marked } from 'marked';
import { parseHTML } from 'zeed-dom';
import type { Doc } from 'yjs';

import './zeed-dom';

/**
 * The schema a rich text body speaks: everything here has safe markdown and
 * HTML renderings. The API serializes bodies with exactly this list, so an
 * extension the renderers or HTML allowlist do not know (task lists,
 * mentions) would be lost or reach customers as raw HTML embedded in their
 * markdown. Additions must teach both output paths about the extension.
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

const bodyHtmlSchema: Schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'col', 'colgroup', 'u'],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      'href',
      ['className', 'body-link'],
      ['rel', 'nofollow', 'noopener', 'noreferrer'],
      'target',
    ],
    col: ['style'],
    img: [...(defaultSchema.attributes?.img ?? []), ['className', 'body-image']],
    table: [...(defaultSchema.attributes?.table ?? []), 'style'],
    td: ['colSpan', 'rowSpan', 'colwidth', 'style'],
    th: ['colSpan', 'rowSpan', 'colwidth', 'style'],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'tel'],
    src: ['http', 'https'],
  },
  required: {
    ...defaultSchema.required,
    a: { rel: 'noopener noreferrer nofollow' },
  },
};

export type BodyContent = {
  markdown: string;
  html: string;
};

/** The ProseMirror schema of the extension list, for Yjs conversions. */
export const bodySchema = getSchema(extensions);

function bodyNode(doc: Doc, fieldKey: string): ProseMirrorNode | null {
  const fragment = bodyFragment(doc, fieldKey);
  if (fragment.length === 0) {
    return null;
  }
  return yXmlFragmentToProseMirrorRootNode(fragment, bodySchema);
}

/**
 * A body's markdown as last saved by the realtime room, or null if it was
 * never written. Serialized with the same extension list the editor runs, so
 * the schema always matches what was typed.
 */
export function bodyMarkdown(doc: Doc, fieldKey: string): string | null {
  const node = bodyNode(doc, fieldKey);
  if (node === null) {
    return null;
  }
  return renderToMarkdown({ extensions, content: node });
}

/** A body's two public representations, rendered from the same document. */
export function bodyContent(doc: Doc, fieldKey: string): BodyContent | null {
  const node = bodyNode(doc, fieldKey);
  if (node === null) {
    return null;
  }
  const renderedHtml = renderToHTMLString({ extensions, content: node });
  return {
    markdown: renderToMarkdown({ extensions, content: node }),
    html: toHtml(sanitize(fromHtml(renderedHtml, { fragment: true }), bodyHtmlSchema)),
  };
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

/**
 * Replaces a body with what `markdown` says, the inverse of `bodyMarkdown`.
 * Takes a document rather than a room, so it serves both the live write in
 * `../write-body` and offline callers building a document of their own (the
 * seed).
 */
export function setBodyMarkdown(doc: Doc, fieldKey: string, markdown: string): void {
  const fragment = bodyFragment(doc, fieldKey);
  fragment.delete(0, fragment.length);
  prosemirrorJSONToYXmlFragment(bodySchema, markdownToBody(markdown), fragment);
}
