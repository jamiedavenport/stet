import type { PageRoom } from '@repo/realtime/client';
import type { PresenceUser } from '@repo/realtime/types';
import type { Extensions } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import Typography from '@tiptap/extension-typography';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

import { notesField } from '#/notes/doc';
import { lowlight } from '#/notes/highlight';
import { mentionExtension } from '#/notes/mention';
import type { MentionOptions } from '#/notes/mention';
import { SlashCommand } from '#/notes/slash-command';

type NoteExtensionOptions = {
  room: PageRoom;
  user: PresenceUser & { color: string };
  mention: MentionOptions;
  onInsertImage: () => void;
  onDropFiles: (files: File[]) => void;
};

/**
 * Every extension the notes editor runs, in one place so the toolbar, the
 * bubble menu, and the slash menu all agree on what the schema supports.
 */
export function noteExtensions(options: NoteExtensionOptions): Extensions {
  return [
    StarterKit.configure({
      // Collaboration ships its own Yjs-aware history handling.
      undoRedo: false,
      // Replaced below by the syntax-highlighting variant.
      codeBlock: false,
      link: { openOnClick: false, HTMLAttributes: { class: 'note-link' } },
    }),
    Collaboration.configure({ document: options.room.doc, field: notesField }),
    CollaborationCaret.configure({
      provider: options.room.provider,
      // The caret extension writes this object to the same awareness `user`
      // field that page presence reads, so it must stay a valid PresenceUser
      // (id, image, name) on top of the caret's color.
      user: options.user,
    }),
    Placeholder.configure({ placeholder: 'Write something, or press / for commands' }),
    CharacterCount.configure({ limit: null }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Typography,
    TableKit.configure({ table: { resizable: true } }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
    Image.configure({ HTMLAttributes: { class: 'note-image' } }),
    FileHandler.configure({
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      onDrop: (_editor, files) => options.onDropFiles(files),
      onPaste: (_editor, files, htmlContent) => {
        // A copied <img> arrives as both a file and its HTML; let the HTML
        // through so pasting from another page keeps the original URL.
        if (htmlContent === undefined) {
          options.onDropFiles(files);
        }
      },
    }),
    mentionExtension(options.mention),
    SlashCommand.configure({ onInsertImage: options.onInsertImage }),
  ];
}
