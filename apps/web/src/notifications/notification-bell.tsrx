import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { useRouter } from '@tanstack/react-router';
import { Bell } from 'lucide-react';

import { timeAgo } from '#/time';
import { useAppRoute } from '#/use-app-route';
import { useNotificationSocket } from '#/notifications/use-notification-socket';
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationsQuery,
} from '#/notifications/functions';
import type { NotificationItem } from '#/notifications/functions';

export function NotificationBell() @{
  const { activeOrganization } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  // Client-only: the badge is live UI fed by the hub socket, and running the
  // feed query during SSR would add a D1 round trip to every page render and
  // tie the SSR stream to a mid-render query. The bell renders empty for a
  // paint and fills in on mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { data: feed } = useQuery({
    ...notificationsQuery(activeOrganization.id),
    enabled: mounted,
  });
  useNotificationSocket();

  let items: NotificationItem[] = [];
  let unread = 0;
  if (feed !== undefined) {
    items = feed.items;
    unread = feed.unread;
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const onSelect = async (item: NotificationItem) => {
    if (item.readAt === null) {
      await markNotificationRead({ data: { id: item.id } });
      await refresh();
    }
    if (item.href !== null) {
      router.history.push(item.href);
    }
  };

  const onMarkAllRead = async () => {
    await markAllNotificationsRead();
    await refresh();
  };

  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button variant="ghost" size="icon" className="relative" aria-label={"Notifications"} />
      }
    >
      <Bell />
      @if (unread > 0) {
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {unread > 9 ? '9+' : unread}
        </span>
      }
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80">
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="text-sm font-medium">{"Notifications"}</p>
        @if (unread > 0) {
          <Button type="button" variant="ghost" size="xs" onClick={() => void onMarkAllRead()}>
            {"Mark all read"}
          </Button>
        }
      </div>
      <DropdownMenuSeparator />
      <div className="max-h-80 overflow-y-auto">
        @for (const item of items; key item.id) {
          <DropdownMenuItem
            className="flex flex-col items-start gap-0.5"
            onClick={() => void onSelect(item)}
          >
            <span className="flex w-full items-center gap-2">
              <span className="flex-1 text-sm">{item.title}</span>
              @if (item.readAt === null) {
                <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={"Unread"} />
              }
            </span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(item.createdAt)}
            </span>
          </DropdownMenuItem>
        } @empty {
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {"Nothing yet. You will see activity from your organization here."}
          </p>
        }
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
}
