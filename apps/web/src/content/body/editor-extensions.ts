import type { PageRoom } from '@repo/realtime/client';
import type { PresenceUser } from '@repo/realtime/types';
import type { Extensions } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import FileHandler from '@tiptap/extension-file-handler';
import { CharacterCount, Placeholder } from '@tiptap/extensions';

import { bodySchemaExtensions } from '#/content/body/extensions';
import { SlashCommand } from '#/content/body/slash-command';

type BodyEditorOptions = {
  room: PageRoom;
  user: PresenceUser & { color: string };
  /** The Yjs root this body binds to, from `bodyField`. */
  field: string;
  onInsertImage: () => void;
  onDropFiles: (files: File[]) => void;
};

/**
 * The body schema plus everything only a live editing session needs. Kept
 * apart from the schema so serializing a body never pulls the editor's React
 * surface into the worker.
 */
export function bodyEditorExtensions(options: BodyEditorOptions): Extensions {
  return [
    ...bodySchemaExtensions(),
    Collaboration.configure({ document: options.room.doc, field: options.field }),
    CollaborationCaret.configure({
      provider: options.room.provider,
      // Written to the same awareness `user` field page presence reads, so it
      // must stay a valid PresenceUser on top of the caret's color.
      user: options.user,
    }),
    Placeholder.configure({ placeholder: 'Write something, or press / for commands' }),
    CharacterCount.configure({ limit: null }),
    SlashCommand.configure({ onInsertImage: options.onInsertImage }),
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
  ];
}
