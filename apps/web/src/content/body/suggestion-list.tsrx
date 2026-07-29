import { useEffect, useImperativeHandle, useState } from 'react';
import type { Ref } from 'react';

import type { SuggestionItem, SuggestionListHandle } from '#/content/body/suggestion';

type SuggestionListProps = {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
  ref?: Ref<SuggestionListHandle>;
};

/**
 * Keyboard-driven list shared by every suggestion popup in the editor. The
 * Suggestion plugin owns positioning, so this renders a plain panel and
 * exposes `onKeyDown` for the plugin to forward arrow and enter presses to.
 */
export function SuggestionList({ items, command, ref }: SuggestionListProps) @{
  const [selected, setSelected] = useState(0);

  // A narrowing query can leave the cursor past the end of the new list.
  useEffect(() => {
    setSelected(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (items.length === 0) {
        return false;
      }
      if (event.key === 'ArrowUp') {
        setSelected((current) => (current + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelected((current) => (current + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[selected];
        if (item !== undefined) {
          command(item);
        }
        return true;
      }
      return false;
    },
  }));

  <div
    role="listbox"
    className="z-50 max-h-72 w-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
  >
    @for (const item of items; index index; key item.id) {
      <button
        type="button"
        role="option"
        aria-selected={index === selected}
        // Mousedown would blur the editor and tear the popup down first.
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => command(item)}
        onMouseEnter={() => setSelected(index)}
        data-selected={index === selected ? '' : undefined}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm data-selected:bg-accent data-selected:text-accent-foreground"
      >
        @if (item.icon !== undefined) {
          <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
            {item.icon}
          </span>
        }
        <span className="flex-1 truncate">{item.label}</span>
        @if (item.hint !== undefined) {
          <span className="max-w-28 truncate text-xs text-muted-foreground">{item.hint}</span>
        }
      </button>
    } @empty {
      <p key="empty" className="px-2 py-1.5 text-sm text-muted-foreground">
        {"No matches"}
      </p>
    }
  </div>
}
