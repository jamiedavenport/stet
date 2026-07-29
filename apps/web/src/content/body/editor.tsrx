import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PageRoom } from '@repo/realtime/client';
import { bodyField } from '@repo/realtime/entry';
import type { PresenceUser } from '@repo/realtime/types';
import { Label } from '@repo/ui/components/label';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import { BubbleToolbar } from '#/content/body/bubble-toolbar.tsrx';
import { bodyEditorExtensions } from '#/content/body/editor-extensions';
import { useBodyEditorState } from '#/content/body/editor-state';
import { useBodyImages } from '#/content/body/images';
import { BodyToolbar } from '#/content/body/toolbar.tsrx';
import { caretColor } from '#/content/presence';
import type { ModelField } from '#/content/model/functions';

type BodyEditorProps = {
  room: PageRoom;
  user: PresenceUser;
  field: ModelField;
};

/** The image callbacks the extensions need before the editor they act on exists. */
type ImageHandlers = {
  insertImage: () => void;
  dropFiles: (files: File[]) => void;
};

const invalidImage = 'That file could not be added. Images must be JPEG, PNG, WebP, or GIF.';

/** One rich text body: a collaborative editor bound to its field's Yjs root. */
export function BodyEditor({ room, user, field }: BodyEditorProps) @{
  // The extension list is built before the editor exists, but the image
  // handlers need that editor to insert into. They are read through this ref,
  // which the surface fills in once it can.
  const handlers = useRef<ImageHandlers>({ insertImage: () => {}, dropFiles: () => {} });

  const editor = useEditor(
    {
      // Create the editor in an effect, not during render: CollaborationCaret
      // publishes its awareness state on creation, which would otherwise
      // setState in presence subscribers mid-render.
      immediatelyRender: false,
      extensions: bodyEditorExtensions({
        room,
        user: { ...user, color: caretColor(user.id) },
        field: bodyField(field.key),
        onInsertImage: () => handlers.current.insertImage(),
        onDropFiles: (files) => handlers.current.dropFiles(files),
      }),
      editorProps: {
        attributes: {
          'aria-label': `${field.name} body`,
          class: 'tiptap-body',
        },
      },
    },
    [room, field.key],
  );

  <div className="flex min-h-0 flex-1 flex-col gap-2">
    <Label>{field.name}</Label>
    @if (editor === null) {
      <div className="min-h-64 flex-1 rounded-lg border" />
    } @else {
      <BodySurface editor={editor} handlers={handlers} />
    }
  </div>
}

type BodySurfaceProps = {
  editor: Editor;
  handlers: RefObject<ImageHandlers>;
};

/** Split so the toolbar's state selector only runs once the editor exists. */
function BodySurface({ editor, handlers }: BodySurfaceProps) @{
  const state = useBodyEditorState(editor);
  const images = useBodyImages(editor, invalidImage);

  useEffect(() => {
    handlers.current = { insertImage: images.openPicker, dropFiles: images.uploadFiles };
  }, [handlers, images.openPicker, images.uploadFiles]);

  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
    <BubbleMenu editor={editor} options={{ placement: 'top' }}>
      <BubbleToolbar editor={editor} state={state} />
    </BubbleMenu>
    <BodyToolbar editor={editor} state={state} onInsertImage={images.openPicker} />
    <div className="min-h-64 flex-1 overflow-y-auto px-4 py-3">
      <EditorContent editor={editor} className="min-h-full" />
    </div>
    <div className="flex items-center gap-3 border-t px-3 py-1.5 text-xs text-muted-foreground">
      <span>{`${state.words} words`}</span>
      @if (images.uploading) {
        <span>{"Uploading image…"}</span>
      }
      @if (images.error !== null) {
        <span className="text-destructive">{images.error}</span>
      }
    </div>
    <input
      ref={images.inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      hidden
      onChange={(event) => {
        images.uploadFiles(Array.from(event.target.files ?? []));
        // Cleared so choosing the same file twice still fires a change.
        event.target.value = '';
      }}
    />
  </div>
}
