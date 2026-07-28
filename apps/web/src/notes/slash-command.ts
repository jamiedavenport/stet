import { m } from '@repo/i18n/messages';
import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { createElement } from 'react';
import {
  CheckSquareIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  QuoteIcon,
  TableIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { suggestionPopup } from '#/notes/suggestion-popup';
import type { SuggestionItem } from '#/notes/suggestion';

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
  icon: LucideIcon,
  run: SlashItem['run'],
): SlashItem {
  return { id, label, keywords, icon: createElement(icon, { className: 'size-4' }), run };
}

function slashItems(options: SlashCommandOptions): SlashItem[] {
  return [
    item('h1', m.heading_1(), 'title h1', Heading1Icon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
    ),
    item('h2', m.heading_2(), 'subtitle h2', Heading2Icon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
    ),
    item('h3', m.heading_3(), 'h3', Heading3Icon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
    ),
    item('bullet-list', m.bullet_list(), 'unordered ul', ListIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    ),
    item('ordered-list', m.numbered_list(), 'ordered ol', ListOrderedIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    ),
    item('task-list', m.task_list(), 'todo checkbox', CheckSquareIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
    ),
    item('blockquote', m.quote(), 'blockquote citation', QuoteIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    ),
    item('code-block', m.code_block(), 'snippet pre', CodeIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    ),
    item('table', m.table(), 'grid rows columns', TableIcon, (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    ),
    item('divider', m.divider(), 'horizontal rule hr', MinusIcon, (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    ),
    item('image', m.image(), 'picture photo upload', ImageIcon, (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      options.onInsertImage();
    }),
  ];
}

/**
 * Notion-style `/` menu. Registered as a plain extension rather than a node so
 * the typed text stays ordinary paragraph content until an item is chosen.
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
