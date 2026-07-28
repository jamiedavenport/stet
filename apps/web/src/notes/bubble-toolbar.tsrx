import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Separator } from '@repo/ui/components/separator';
import type { Editor } from '@tiptap/react';
import { BoldIcon, CodeIcon, ItalicIcon, LinkIcon, StrikethroughIcon, UnlinkIcon } from 'lucide-react';
import { useState } from 'react';

import { ToolbarButton } from '#/notes/toolbar-button.tsrx';
import type { NoteEditorState } from '#/notes/editor-state';

type BubbleToolbarProps = {
  editor: Editor;
  state: NoteEditorState;
};

/**
 * Contents of the selection bubble: the inline marks, plus a link field that
 * replaces the buttons while a URL is being entered.
 */
export function BubbleToolbar({ editor, state }: BubbleToolbarProps) @{
  const [editingLink, setEditingLink] = useState(false);
  const [href, setHref] = useState('');

  const openLinkEditor = () => {
    const current = editor.getAttributes('link').href;
    setHref(typeof current === 'string' ? current : '');
    setEditingLink(true);
  };

  const applyLink = () => {
    const trimmed = href.trim();
    if (trimmed === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: trimmed }).run();
    }
    setEditingLink(false);
  };

  <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
    @if (editingLink) {
      <>
        <Input
          autoFocus
          value={href}
          type="url"
          aria-label={"Link URL"}
          placeholder="https://example.com"
          className="h-7 w-56 text-sm"
          onChange={(event) => setHref(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyLink();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setEditingLink(false);
            }
          }}
        />
        <Button type="button" size="sm" variant="ghost" onClick={applyLink}>
          {"Apply"}
        </Button>
      </>
    } @else {
      <>
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
          label={"Add link"}
          icon={<LinkIcon />}
          active={state.link}
          onClick={openLinkEditor}
        />
        @if (state.link) {
          <ToolbarButton
            label={"Remove link"}
            icon={<UnlinkIcon />}
            onClick={() => editor.chain().focus().unsetLink().run()}
          />
        }
      </>
    }
  </div>
}
