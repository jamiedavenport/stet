import { useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';

export type NoteEditorState = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  blockquote: boolean;
  codeBlock: boolean;
  inTable: boolean;
  canUndo: boolean;
  canRedo: boolean;
  characters: number;
  words: number;
};

/**
 * One subscription for every toolbar control. `useEditorState` re-renders only
 * when the selected slice changes, so per-button `editor.isActive` calls (which
 * would re-render the whole toolbar on every keystroke) are not needed.
 */
export function useNoteEditorState(editor: Editor): NoteEditorState {
  return useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      strike: instance.isActive('strike'),
      code: instance.isActive('code'),
      link: instance.isActive('link'),
      heading1: instance.isActive('heading', { level: 1 }),
      heading2: instance.isActive('heading', { level: 2 }),
      heading3: instance.isActive('heading', { level: 3 }),
      bulletList: instance.isActive('bulletList'),
      orderedList: instance.isActive('orderedList'),
      taskList: instance.isActive('taskList'),
      blockquote: instance.isActive('blockquote'),
      codeBlock: instance.isActive('codeBlock'),
      inTable: instance.isActive('table'),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
      characters: instance.storage.characterCount.characters(),
      words: instance.storage.characterCount.words(),
    }),
  });
}
