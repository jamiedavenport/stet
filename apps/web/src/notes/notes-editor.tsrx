import type { PageRoom } from '@repo/realtime/client';
import type { PresenceUser } from '@repo/realtime/types';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { GripVerticalIcon } from 'lucide-react';
import { useRef } from 'react';

import { BubbleToolbar } from '#/notes/bubble-toolbar.tsrx';
import { EditorToolbar } from '#/notes/editor-toolbar.tsrx';
import { acceptAttribute } from '#/files/kinds';
import { noteExtensions } from '#/notes/extensions';
import { useNoteEditorState } from '#/notes/editor-state';
import { useNoteImages } from '#/notes/use-note-images';
import type { MentionMember } from '#/notes/mention';

type NotesEditorProps = {
  room: PageRoom;
  user: PresenceUser;
  members: MentionMember[];
  onMention: (member: MentionMember) => void;
};

export function NotesEditor({ room, user, members, onMention }: NotesEditorProps) @{
  // The roster and the notify callback both resolve after the editor exists;
  // reading them through refs keeps the extension list out of the deps, so
  // the collaborative binding is never torn down and rebuilt.
  const latest = useRef({ members, onMention });
  latest.current = { members, onMention };

  const imagePicker = useRef<() => void>(() => {});
  const imageDrop = useRef<(files: File[]) => void>(() => {});

  const editor = useEditor(
    {
      // Create the editor in an effect, not during render: CollaborationCaret
      // publishes its awareness state on creation, which would otherwise
      // setState in presence subscribers mid-render.
      immediatelyRender: false,
      extensions: noteExtensions({
        room,
        user: { ...user, color: caretColor(user.id) },
        mention: {
          getMembers: () => latest.current.members,
          onMention: (member) => latest.current.onMention(member),
        },
        onInsertImage: () => imagePicker.current(),
        onDropFiles: (files) => imageDrop.current(files),
      }),
      editorProps: {
        attributes: {
          'aria-label': "Notes editor",
          class: 'tiptap-notes',
        },
      },
    },
    [room],
  );

  @if (editor !== null) {
    <EditorSurface editor={editor} pickerRef={imagePicker} dropRef={imageDrop} />
  }
}

type EditorSurfaceProps = {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  pickerRef: React.RefObject<() => void>;
  dropRef: React.RefObject<(files: File[]) => void>;
};

/**
 * Split from NotesEditor because every control needs a non-null editor: the
 * state selector and the upload hook can only run once it exists.
 */
function EditorSurface({ editor, pickerRef, dropRef }: EditorSurfaceProps) @{
  const state = useNoteEditorState(editor);
  const images = useNoteImages(editor, "Images must be JPEG, PNG, WebP, or GIF, and 5 MB or smaller.");

  pickerRef.current = images.openPicker;
  dropRef.current = images.uploadFiles;

  <div className="flex w-full flex-col">
    <EditorToolbar editor={editor} state={state} onInsertImage={images.openPicker} />

    <BubbleMenu editor={editor} options={{ placement: 'top' }}>
      <BubbleToolbar editor={editor} state={state} />
    </BubbleMenu>

    <DragHandle editor={editor}>
      <span
        aria-hidden="true"
        className="flex cursor-grab items-center text-muted-foreground opacity-60 hover:opacity-100"
      >
        <GripVerticalIcon className="size-4" />
      </span>
    </DragHandle>

    <div className="rounded-b-lg border p-3">
      <EditorContent editor={editor} />
    </div>

    <input
      ref={images.inputRef}
      type="file"
      accept={acceptAttribute('note-image')}
      multiple
      className="sr-only"
      onChange={(event) => {
        images.uploadFiles([...(event.target.files ?? [])]);
        // Clear so re-picking the same file fires change again.
        event.target.value = '';
      }}
    />

    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <span>{`${state.words} words`}</span>
      <span>{`${state.characters} characters`}</span>
      @if (images.uploading) {
        <span>{"Uploading..."}</span>
      }
      @if (images.error !== null) {
        <span className="text-destructive">{images.error}</span>
      }
    </p>
  </div>
}

const caretPalette = ['#f783ac', '#74b816', '#4dabf7', '#ffa94d', '#9775fa', '#38d9a9'];

function caretColor(userId: string): string {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }
  return caretPalette[hash % caretPalette.length];
}
