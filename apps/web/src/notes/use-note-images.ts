import type { Editor } from '@tiptap/react';
import { useCallback, useRef, useState } from 'react';

import { acceptsContentType, acceptsSize } from '#/files/kinds';
import { uploadFile } from '#/files/upload';

type NoteImages = {
  /** Attach to a visually hidden file input for the toolbar and slash menu. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  error: string | null;
  uploading: boolean;
  openPicker: () => void;
  uploadFiles: (files: File[]) => void;
};

/**
 * Uploads images into R2 and inserts them at the cursor. Rejected files are
 * reported through `error` rather than thrown, so a bad paste never takes the
 * editor down with it.
 */
export function useNoteImages(editor: Editor, invalidMessage: string): NoteImages {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(
    (files: File[]) => {
      const accepted = files.filter(
        (file) =>
          acceptsContentType('note-image', file.type) && acceptsSize('note-image', file.size),
      );
      if (accepted.length < files.length) {
        setError(invalidMessage);
      }
      if (accepted.length === 0) {
        return;
      }

      setUploading(true);
      void (async () => {
        try {
          for (const file of accepted) {
            const { url } = await uploadFile('note-image', file);
            editor.chain().focus().setImage({ src: url }).run();
          }
          setError(null);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : invalidMessage);
        } finally {
          setUploading(false);
        }
      })();
    },
    [editor, invalidMessage],
  );

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return { inputRef, error, uploading, openPicker, uploadFiles };
}
