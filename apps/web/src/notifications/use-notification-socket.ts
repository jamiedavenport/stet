import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Live updates for the notification feed. The hub only ever says "refresh":
// the socket carries no payload, so there is nothing to validate and the
// feed always comes from the typed server function. Reconnects with capped
// exponential backoff; a missed nudge only costs staleness until the next
// refetch.
export function useNotificationSocket(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let timer: number | undefined;
    let attempt = 0;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${window.location.host}/api/notifications`);
      socket.onopen = () => {
        attempt = 0;
      };
      socket.onmessage = () => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      };
      socket.onclose = () => {
        if (disposed) {
          return;
        }
        attempt += 1;
        const delay = Math.min(30_000, 1_000 * 2 ** attempt);
        timer = window.setTimeout(connect, delay);
      };
    };
    connect();

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      if (socket !== null) {
        socket.close();
      }
    };
  }, [queryClient]);
}
