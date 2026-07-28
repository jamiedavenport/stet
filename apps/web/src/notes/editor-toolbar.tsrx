import { Separator } from '@repo/ui/components/separator';
import type { Editor } from '@tiptap/react';
import {
  BoldIcon,
  CheckSquareIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  StrikethroughIcon,
  TableIcon,
  Undo2Icon,
} from 'lucide-react';

import { LanguagePicker } from '#/notes/language-picker.tsrx';
import { ToolbarButton } from '#/notes/toolbar-button.tsrx';
import type { NoteEditorState } from '#/notes/editor-state';

type EditorToolbarProps = {
  editor: Editor;
  state: NoteEditorState;
  onInsertImage: () => void;
};

/**
 * The always-visible controls above the document. Undo and redo run through
 * the Collaboration extension's Yjs-aware history, since StarterKit's own
 * undoRedo is disabled for collaborative editing.
 */
export function EditorToolbar({ editor, state, onInsertImage }: EditorToolbarProps) @{
  <div
    role="toolbar"
    aria-label={"Formatting"}
    className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 bg-muted/40 p-1"
  >
    <ToolbarButton
      label={"Undo"}
      icon={<Undo2Icon />}
      disabled={!state.canUndo}
      onClick={() => editor.chain().focus().undo().run()}
    />
    <ToolbarButton
      label={"Redo"}
      icon={<Redo2Icon />}
      disabled={!state.canRedo}
      onClick={() => editor.chain().focus().redo().run()}
    />

    <Separator orientation="vertical" className="mx-1 max-h-5" />

    <ToolbarButton
      label={"Bold"}
      icon={<BoldIcon />}
      active={state.bold}
      onClick={() => editor.chain().focus().toggleBold().run()}
    />
    <ToolbarButton
      label={"Italic"}
      icon={<ItalicIcon />}
      active={state.italic}
      onClick={() => editor.chain().focus().toggleItalic().run()}
    />
    <ToolbarButton
      label={"Strikethrough"}
      icon={<StrikethroughIcon />}
      active={state.strike}
      onClick={() => editor.chain().focus().toggleStrike().run()}
    />
    <ToolbarButton
      label={"Inline code"}
      icon={<CodeIcon />}
      active={state.code}
      onClick={() => editor.chain().focus().toggleCode().run()}
    />

    <Separator orientation="vertical" className="mx-1 max-h-5" />

    <ToolbarButton
      label={"Heading 1"}
      icon={<Heading1Icon />}
      active={state.heading1}
      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
    />
    <ToolbarButton
      label={"Heading 2"}
      icon={<Heading2Icon />}
      active={state.heading2}
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
    />
    <ToolbarButton
      label={"Heading 3"}
      icon={<Heading3Icon />}
      active={state.heading3}
      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
    />

    <Separator orientation="vertical" className="mx-1 max-h-5" />

    <ToolbarButton
      label={"Bullet list"}
      icon={<ListIcon />}
      active={state.bulletList}
      onClick={() => editor.chain().focus().toggleBulletList().run()}
    />
    <ToolbarButton
      label={"Numbered list"}
      icon={<ListOrderedIcon />}
      active={state.orderedList}
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
    />
    <ToolbarButton
      label={"Task list"}
      icon={<CheckSquareIcon />}
      active={state.taskList}
      onClick={() => editor.chain().focus().toggleTaskList().run()}
    />
    <ToolbarButton
      label={"Quote"}
      icon={<QuoteIcon />}
      active={state.blockquote}
      onClick={() => editor.chain().focus().toggleBlockquote().run()}
    />

    <Separator orientation="vertical" className="mx-1 max-h-5" />

    <ToolbarButton
      label={"Table"}
      icon={<TableIcon />}
      active={state.inTable}
      onClick={() =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      }
    />
    <ToolbarButton label={"Image"} icon={<ImageIcon />} onClick={onInsertImage} />

    @if (state.codeBlock) {
      <>
        <Separator orientation="vertical" className="mx-1 max-h-5" />
        <LanguagePicker editor={editor} />
      </>
    }
  </div>
}
