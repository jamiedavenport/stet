import type { LucideIcon } from 'lucide-react';

/** Which set of groups the menu is showing. */
export type Page = 'root' | 'organizations';

/**
 * One row of the command menu. Destinations, actions and search hits all
 * reduce to this, so the menu renders a single kind of item and each row
 * carries the work it does.
 */
export type Entry = {
  id: string;
  label: string;
  /** Secondary text, e.g. an email address or a content type. */
  hint?: string;
  /** Key hint shown on the right, e.g. `G N`. */
  shortcut?: string;
  icon: LucideIcon;
  run: () => void;
};

/** A labelled section, in the shape Base UI's grouped items expect. */
export type Group = {
  value: string;
  items: Entry[];
};
