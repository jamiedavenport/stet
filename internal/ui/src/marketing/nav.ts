import type { LinkProps } from '@tanstack/react-router';

// A plain module rather than a type in `ui.tsrx`: the type-aware lint cannot
// resolve types exported across the `.tsrx` boundary.

/** One destination in the header or footer, wherever those take a list. */
export type MarketingNavLink = {
  label: string;
  /** Shown under the label in the header's menus, and nowhere else. */
  description?: string;
  to: LinkProps['to'];
  params?: LinkProps['params'];
};
