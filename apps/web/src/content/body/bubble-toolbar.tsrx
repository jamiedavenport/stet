import { markdownToBody } from '@repo/content/body';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Separator } from '@repo/ui/components/separator';
import { useQuery } from '@tanstack/react-query';
import type { Editor } from '@tiptap/react';
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  Loader2Icon,
  SparklesIcon,
  StrikethroughIcon,
  UnlinkIcon,
} from 'lucide-react';
import { useState } from 'react';

import { transformText } from '#/ai/functions';
import { ToolbarButton } from '#/content/body/toolbar-button.tsrx';
import type { BodyEditorState } from '#/content/body/editor-state';
import { orgBillingQuery } from '#/organization/functions';
import { useAppRoute } from '#/use-app-route';

type BubbleToolbarProps = {
  editor: Editor;
  state: BodyEditorState;
};

/** Selection rewrites the bubble offers, each a one-shot instruction. */
const aiActions = [
  { label: 'Improve writing', instruction: 'Improve the writing: clearer and tighter, same meaning and tone.' },
  { label: 'Fix spelling & grammar', instruction: 'Fix spelling, grammar, and punctuation. Change nothing else.' },
  { label: 'Make shorter', instruction: 'Condense this to about half its length without losing key information.' },
  { label: 'Make longer', instruction: 'Expand this with more detail, keeping the same voice.' },
];

/**
 * Contents of the selection bubble: the inline marks, a link field that
 * replaces the buttons while a URL is being entered, and (on plans with the
 * AI feature) rewrite actions that replace the selection in one undoable
 * step.
 */
export function BubbleToolbar({ editor, state }: BubbleToolbarProps) @{
  const { activeOrganization } = useAppRoute();
  const billing = useQuery(orgBillingQuery(activeOrganization.id));
  const aiEnabled = billing.data?.features.ai === true;

  const [editingLink, setEditingLink] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [transforming, setTransforming] = useState(false);
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

  const runAi = async (instruction: string) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, '\n');
    if (text.trim() === '' || transforming) {
      return;
    }
    setTransforming(true);
    try {
      const result = await transformText({ data: { instruction, text } });
      const content = markdownToBody(result.text).content ?? [];
      // A single paragraph goes in as inline nodes, so rewriting mid-sentence
      // does not split the block it sits in.
      const inline =
        content.length === 1 && content[0].type === 'paragraph'
          ? (content[0].content ?? [])
          : content;
      editor.chain().focus().insertContentAt({ from, to }, inline).run();
    } finally {
      setTransforming(false);
      setAiOpen(false);
    }
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
        @if (aiOpen) {
          <>
            @for (const action of aiActions; key action.label) {
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={transforming}
                onClick={() => void runAi(action.instruction)}
              >
                {action.label}
              </Button>
            }
            @if (transforming) {
              <Loader2Icon className="mx-1 size-4 animate-spin text-muted-foreground" />
            }
          </>
        }
        @if (!aiOpen) {
          <>
            @if (aiEnabled) {
              <>
                <ToolbarButton
                  label={"Rewrite with AI"}
                  icon={<SparklesIcon />}
                  onClick={() => setAiOpen(true)}
                />
                <Separator orientation="vertical" className="mx-1 max-h-5" />
              </>
            }
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
      </>
    }
  </div>
}
