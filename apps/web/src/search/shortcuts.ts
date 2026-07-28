import { useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';

import { navLeaderKey } from '#/navigation';
import type { NavItem } from '#/navigation';

/** How long the leader key stays armed before the sequence lapses. */
const sequenceTimeout = 1500;

/** Whether the user is typing into something rather than driving the app. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

/** Whether a keystroke is a plain letter rather than part of a chord. */
function isPlainKey(event: KeyboardEvent): boolean {
  return !event.metaKey && !event.ctrlKey && !event.altKey;
}

/** Opens the command menu on Cmd+K, the one binding that works while typing. */
export function useCommandMenuShortcut(toggle: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggle]);
}

/**
 * Binds `G` followed by a page's key as a jump-to shortcut, over the same list
 * the sidebar and command menu render, so a member never has a shortcut to a
 * page they cannot open.
 *
 * Disabled while `paused` (the command menu is open) and while the caret is in
 * a field, where `g` is just a letter.
 */
export function useNavigationShortcuts(items: readonly NavItem[], paused: boolean): void {
  const router = useRouter();
  // Read through refs so re-arming does not tear down the listener mid-sequence.
  const state = useRef({ items, paused });
  state.current = { items, paused };

  useEffect(() => {
    let armed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const disarm = () => {
      armed = false;
      clearTimeout(timer);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (state.current.paused || isTyping(event.target) || !isPlainKey(event)) {
        disarm();
        return;
      }

      const key = event.key.toLowerCase();

      if (!armed) {
        if (key === navLeaderKey) {
          armed = true;
          timer = setTimeout(disarm, sequenceTimeout);
        }
        return;
      }

      disarm();
      const item = state.current.items.find((candidate) => candidate.key === key);
      if (item !== undefined) {
        event.preventDefault();
        void router.navigate({ to: item.to });
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      disarm();
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [router]);
}
