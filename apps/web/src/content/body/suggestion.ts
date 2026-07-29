import type { ReactNode } from 'react';

// These live in a plain module rather than beside the component in
// suggestion-list.tsrx because `vp check` type checks without the TSRX plugin,
// where a .tsrx import resolves through the `declare module '*.tsrx'` fallback
// and every type imported from one degrades to `any`.

export type SuggestionItem = {
  id: string;
  label: string;
  /** Secondary line, e.g. a member's email or a command's description. */
  hint?: string;
  icon?: ReactNode;
};

export type SuggestionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};
