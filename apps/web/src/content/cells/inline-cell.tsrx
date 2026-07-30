import { useState } from 'react';
import type { ReactNode } from 'react';
import { Input } from '@repo/ui/components/input';

export type InlineCellProps = {
  /** Accessible name of the cell; the input it opens is named separately. */
  label: string;
  inputLabel: string;
  /** What the editor starts from, and what Escape puts back. */
  text: string;
  type?: 'text' | 'number' | 'url';
  mono?: boolean;
  /** Commits the typed value; false keeps the editor open and marks it invalid. */
  onCommit: (raw: string) => boolean;
  onEditingChange: (editing: boolean) => void;
  /** Runs instead of editing when the click carries Ctrl or Cmd. */
  onModifierClick?: () => void;
  /** The read view, shown until the cell is clicked. */
  children: ReactNode;
};

/**
 * A cell edited where it sits: the value in place until it is clicked, an
 * input in the same box after. Enter and clicking away commit, Escape puts
 * back what was there.
 */
export function InlineCell(props: InlineCellProps) @{
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const open = () => {
    setDraft(props.text);
    setInvalid(false);
    props.onEditingChange(true);
  };

  const close = () => {
    setDraft(null);
    setInvalid(false);
    props.onEditingChange(false);
  };

  const commit = (raw: string) => {
    if (props.onCommit(raw)) {
      close();
      return;
    }
    setInvalid(true);
  };

  @if (draft !== null) {
    <Input
      autoFocus
      type={props.type ?? 'text'}
      value={draft}
      aria-label={props.inputLabel}
      aria-invalid={invalid}
      className={
        props.mono === true ? 'h-8 min-w-0 flex-1 px-1 font-mono text-xs' : 'h-8 min-w-0 flex-1 px-1'
      }
      onChange={(event) => {
        setDraft(event.target.value);
        setInvalid(false);
      }}
      // Clicking away is not a place to argue about the value: whatever the
      // cell will not take is dropped, and the cell keeps what it had.
      onBlur={(event) => {
        props.onCommit(event.target.value);
        close();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit(event.currentTarget.value);
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      }}
    />
  } @else {
    <button
      type="button"
      aria-label={props.label}
      className="flex min-h-7 min-w-0 flex-1 items-center rounded-md px-1 text-left hover:bg-muted/60"
      onClick={(event) => {
        if (props.onModifierClick !== undefined && (event.ctrlKey || event.metaKey)) {
          props.onModifierClick();
          return;
        }
        open();
      }}
    >
      <span className="min-w-0 flex-1 overflow-hidden">{props.children}</span>
    </button>
  }
}
