import type { PresenceUser } from '@repo/realtime/types';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';

import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';

/** Who else is in this cell, ringed so they read as live rather than as a value. */
export function Watchers({ watchers }: { watchers: PresenceUser[] }) @{
  @if (watchers.length > 0) {
    <span className="flex shrink-0 items-center -space-x-1">
      @for (const watcher of watchers; key watcher.id) {
        <span title={`${watcher.name} is editing`}>
          <Avatar size="sm" className="size-4 ring-2 ring-primary">
            <AvatarImage src={imageSrc(watcher.image, 64)} />
            <AvatarFallback className="text-[8px]">{initials(watcher.name)}</AvatarFallback>
          </Avatar>
        </span>
      }
    </span>
  }
}
