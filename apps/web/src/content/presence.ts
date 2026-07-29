import { useEffect, useRef, useState } from 'react';
import type { PageRoom } from '@repo/realtime/client';
import { isPresenceUser } from '@repo/realtime/types';
import type { PresenceUser } from '@repo/realtime/types';

/** Where in the table a person is working: a row, or one cell of it. */
export type CellLocation = { entryId: string; fieldKey: string | null };

function isCellLocation(value: unknown): value is CellLocation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const location = value as { entryId?: unknown; fieldKey?: unknown };
  return (
    typeof location.entryId === 'string' &&
    (typeof location.fieldKey === 'string' || location.fieldKey === null)
  );
}

/** Publishes (or clears) the caller's own location for others to render. */
export function setCellLocation(room: PageRoom, location: CellLocation | null): void {
  room.provider.awareness.setLocalStateField('cell', location);
}

type CellPresence = { user: PresenceUser; location: CellLocation };

/**
 * Everyone else's location in this room's table. The caller's own state is
 * excluded: rendering your own presence back at you is just noise.
 */
function useCellPresence(room: PageRoom | null): CellPresence[] {
  const [presences, setPresences] = useState<CellPresence[]>([]);

  useEffect(() => {
    if (room === null) {
      setPresences([]);
      return;
    }
    const awareness = room.provider.awareness;
    const update = () => {
      const next: CellPresence[] = [];
      for (const [clientId, state] of awareness.getStates()) {
        if (clientId === awareness.clientID) {
          continue;
        }
        const user = (state as { user?: unknown }).user;
        const location = (state as { cell?: unknown }).cell;
        if (isPresenceUser(user) && isCellLocation(location)) {
          next.push({ user, location });
        }
      }
      setPresences(next);
    };
    awareness.on('change', update);
    update();
    return () => {
      awareness.off('change', update);
    };
  }, [room]);

  return presences;
}

/** One entry per person, however many tabs or windows they brought. */
function dedupe(users: PresenceUser[]): PresenceUser[] {
  return [...new Map(users.map((user) => [user.id, user])).values()];
}

/**
 * Everyone else editing one specific cell. Each cell subscribes for itself so
 * presence changes re-render cells without rebuilding the table's columns,
 * which would unmount them (and close whatever popover was open).
 */
export function useCellWatchers(
  room: PageRoom | null,
  entryId: string,
  fieldKey: string,
): PresenceUser[] {
  const presence = useCellPresence(room);
  return dedupe(
    presence
      .filter((p) => p.location.entryId === entryId && p.location.fieldKey === fieldKey)
      .map((p) => p.user),
  );
}

/** Everyone else somewhere in the entry's row. */
export function useRowWatchers(room: PageRoom | null, entryId: string): PresenceUser[] {
  const presence = useCellPresence(room);
  return dedupe(presence.filter((p) => p.location.entryId === entryId).map((p) => p.user));
}

const caretPalette = ['#f783ac', '#74b816', '#4dabf7', '#ffa94d', '#9775fa', '#38d9a9'];

/** A stable collaboration color for a user, shared by every editor surface. */
export function caretColor(userId: string): string {
  let hash = 0;
  for (const char of userId) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }
  return caretPalette[hash % caretPalette.length];
}

const versionKey = 'version';

/**
 * Signals other clients in the room that the collection changed, so their
 * entry queries refetch. The counter rides the room's shared doc: nothing
 * reads its value, only the change event matters.
 */
export function bumpContentVersion(room: PageRoom): void {
  const map = room.doc.getMap<number>('content');
  map.set(versionKey, (map.get(versionKey) ?? 0) + 1);
}

/** Runs `onBump` when another client bumps the room's content version. */
export function useContentVersion(room: PageRoom | null, onBump: () => void): void {
  // A ref so a new callback identity never tears down the observer.
  const callback = useRef(onBump);
  callback.current = onBump;

  useEffect(() => {
    if (room === null) {
      return;
    }
    const map = room.doc.getMap<number>('content');
    const observer = (event: { transaction: { local: boolean } }) => {
      // The local mutation already refetched; only remote bumps matter.
      if (!event.transaction.local) {
        callback.current();
      }
    };
    map.observe(observer);
    return () => {
      map.unobserve(observer);
    };
  }, [room]);
}
