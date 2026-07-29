import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { createElement } from 'react';
import {
  CodeIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextHThreeIcon,
  ImageIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MinusIcon,
  QuotesIcon,
  TableIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { suggestionPopup } from '#/content/body/suggestion-popup';
import type { SuggestionItem } from '#/content/body/suggestion';

type SlashItem = SuggestionItem & {
  /** Words matched against the query on top of the label. */
  keywords: string;
  run: (editor: Editor, range: Range) => void;
};

export type SlashCommandOptions = {
  /** Opens the file picker; the image item has no editor command of its own. */
  onInsertImage: () => void;
};

function item(
  id: string,
  label: string,
  keywords: string,
  icon: Icon,
  run: SlashItem['run'],
): SlashItem {
  return { id, label, keywords, icon: createElement(icon, { className: 'size-4' }), run };
}

function slashItems(options: SlashCommandOptions): SlashItem[] {
  return [
    item('h1', 'Heading 1', 'title h1', TextHOneIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
    ),
    item('h2', 'Heading 2', 'subtitle h2', TextHTwoIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
    ),
    item('h3', 'Heading 3', 'h3', TextHThreeIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
    ),
    item('bullet-list', 'Bullet list', 'unordered ul', ListBulletsIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    ),
    item('ordered-list', 'Numbered list', 'ordered ol', ListNumbersIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    ),
    item('blockquote', 'Quote', 'blockquote citation', QuotesIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    ),
    item('code-block', 'Code block', 'snippet pre', CodeIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    ),
    item('table', 'Table', 'grid rows columns', TableIcon, (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    ),
    item('divider', 'Divider', 'horizontal rule hr', MinusIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    ),
    item('image', 'Image', 'picture photo upload', ImageIcon, (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      options.onInsertImage();
    }),
  ];
}

/**
 * Notion-style `/` menu. Registered as a plain extension rather than a node so
 * the typed text stays ordinary paragraph content until an item is chosen.
 *
 * Every item inserts something the markdown serializer renders; anything
 * added here has to survive `bodyMarkdown` too.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onInsertImage: () => {} };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        // Without this the menu opens mid-word, e.g. when typing a path.
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) => {
          const needle = query.toLowerCase();
          return slashItems(options).filter(
            (entry) =>
              entry.label.toLowerCase().includes(needle) || entry.keywords.includes(needle),
          );
        },
        command: ({ editor, range, props }) => {
          props.run(editor, range);
        },
        render: suggestionPopup<SlashItem>(),
      }),
    ];
  },
});
