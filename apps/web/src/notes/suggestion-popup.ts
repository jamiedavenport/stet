import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { createRef } from 'react';

import { SuggestionList } from '#/notes/suggestion-list.tsrx';
import type { SuggestionItem, SuggestionListHandle } from '#/notes/suggestion';

/**
 * Builds the `render` half of a Suggestion config around {@link SuggestionList}.
 * Positioning is left to the plugin's own `props.mount`, so mentions, slash
 * commands, and emoji all share one popup implementation.
 */
export function suggestionPopup<TItem extends SuggestionItem>(): SuggestionOptions<
  TItem,
  never
>['render'] {
  return () => {
    let renderer: ReactRenderer<SuggestionListHandle> | null = null;
    let unmount: (() => void) | null = null;
    const handle = createRef<SuggestionListHandle>();

    return {
      onStart: (props) => {
        renderer = new ReactRenderer(SuggestionList, {
          editor: props.editor,
          props: { items: props.items, command: props.command, ref: handle },
        });
        unmount = props.mount(renderer.element);
      },
      onUpdate: (props) => {
        renderer?.updateProps({ items: props.items, command: props.command, ref: handle });
      },
      onKeyDown: (props) => {
        if (props.event.key === 'Escape') {
          return true;
        }
        return handle.current?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        unmount?.();
        unmount = null;
        renderer?.destroy();
        renderer = null;
      },
    };
  };
}
