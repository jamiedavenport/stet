import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import YProvider from 'y-partyserver/provider';
import * as Y from 'yjs';

import { isPresenceUser } from './types';
import type { PresenceUser } from './types';

export type PageRoom = {
  doc: Y.Doc;
  // The page this room was opened for. During navigation the shared provider
  // swaps rooms while the outgoing page is still mounted, so page components
  // must check this before binding anything to `doc` or `provider`.
  page: string;
  provider: YProvider;
};

type PageRoomState = {
  room: PageRoom | null;
  users: PresenceUser[];
};

type UsePageRoomOptions = {
  enabled?: boolean;
  page: string;
  user: PresenceUser;
};

// Connects to the org-scoped room for `page` and exposes both the shared
// Y.Doc (task lists, notes, ...) and the presence users derived from the
// provider's awareness states. `room` is null until the effect runs on the
// client, so consumers gate rendering on it. Prefer PageRoomProvider so the
// whole page shares one WebSocket.
export function usePageRoom({ enabled = true, page, user }: UsePageRoomOptions): PageRoomState {
  const [room, setRoom] = useState<PageRoom | null>(null);
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const { id, image, name } = user;

  useEffect(() => {
    if (!enabled) {
      setRoom(null);
      setUsers([]);
      return;
    }

    const doc = new Y.Doc();
    // `prefix` routes past the default /parties/:party/:room path so the
    // worker can authenticate and pick the org-scoped room itself; the room
    // argument only namespaces the cross-tab BroadcastChannel.
    const provider = new YProvider(window.location.host, page, doc, {
      params: { page },
      prefix: '/api/realtime',
      maxBackoffTime: 30_000,
    });

    provider.awareness.setLocalStateField('user', { id, image, name });

    const updateUsers = () => {
      const seen = new Map<string, PresenceUser>();
      for (const state of provider.awareness.getStates().values()) {
        const candidate = (state as { user?: unknown }).user;
        if (isPresenceUser(candidate) && !seen.has(candidate.id)) {
          seen.set(candidate.id, candidate);
        }
      }
      setUsers([...seen.values()]);
    };

    provider.awareness.on('change', updateUsers);
    updateUsers();
    setRoom({ doc, page, provider });

    return () => {
      provider.awareness.off('change', updateUsers);
      provider.destroy();
      doc.destroy();
      setRoom(null);
      setUsers([]);
    };
  }, [enabled, page, id, image, name]);

  return { room, users };
}

const PageRoomContext = createContext<PageRoomState | null>(null);

// Mount once per page (e.g. in the app layout) so presence and page features
// share a single WebSocket connection to the room.
export function PageRoomProvider({
  children,
  ...options
}: UsePageRoomOptions & { children: ReactNode }) {
  const state = usePageRoom(options);
  return <PageRoomContext.Provider value={state}>{children}</PageRoomContext.Provider>;
}

export function usePageRoomContext(): PageRoomState {
  const state = useContext(PageRoomContext);
  if (state === null) {
    throw new Error('usePageRoomContext must be used inside a PageRoomProvider.');
  }
  return state;
}
