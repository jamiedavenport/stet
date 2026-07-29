import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type AssistantValue = {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly toggle: () => void;
};

const AssistantContext = createContext<AssistantValue | null>(null);

/**
 * Holds the assistant panel's open state above the header, the command menu,
 * and the panel itself, so any of them can summon the one panel the layout
 * renders.
 */
export function AssistantProvider({ children }: { children: ReactNode }) @{
  const [open, setOpen] = useState(false);
  const value = useMemo(
    () => ({ open, setOpen, toggle: () => setOpen((current) => !current) }),
    [open],
  );

  <AssistantContext value={value}>{children}</AssistantContext>
}

export function useAssistant(): AssistantValue {
  const value = useContext(AssistantContext);
  if (value === null) {
    throw new Error('useAssistant must be used within an AssistantProvider.');
  }
  return value;
}

/**
 * Toggles the panel on Cmd+I. Works while typing in plain fields, like
 * Cmd+K, but yields inside rich text, where Cmd+I is italic.
 */
export function useAssistantShortcut(toggle: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.isContentEditable) {
        return;
      }
      if (event.key.toLowerCase() === 'i' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggle]);
}
