import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type CommandMenuValue = {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly toggle: () => void;
};

const CommandMenuContext = createContext<CommandMenuValue | null>(null);

/**
 * Holds the command menu's open state above both the sidebar and the menu
 * itself, so the sidebar's search row opens the one dialog the layout renders.
 */
export function CommandMenuProvider({ children }: { children: ReactNode }) @{
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ open, setOpen, toggle: () => setOpen((current) => !current) }),
    [open],
  );

  <CommandMenuContext value={value}>{children}</CommandMenuContext>
}

export function useCommandMenu(): CommandMenuValue {
  const value = useContext(CommandMenuContext);
  if (value === null) {
    throw new Error('useCommandMenu must be used within a CommandMenuProvider.');
  }
  return value;
}
