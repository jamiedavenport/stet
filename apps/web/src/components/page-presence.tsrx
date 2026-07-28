import { m } from '@repo/i18n/messages';
import { usePageRoomContext } from '@repo/realtime/client';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@repo/ui/components/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip';
import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';

const maximumAvatars = 3;

export function PagePresence() @{
  const { users } = usePageRoomContext();

  const visibleUsers = users.slice(0, maximumAvatars);
  const hiddenUsers = users.length - visibleUsers.length;

  @if (users.length > 0) {
    <AvatarGroup aria-label={m.people_active_on_this_page()} data-size="sm">
      @for (const presence of visibleUsers; key presence.id) {
        <Tooltip>
          <TooltipTrigger render={<Avatar size="sm" />}>
            <AvatarImage src={imageSrc(presence.image, 64)} />
            <AvatarFallback>{initials(presence.name)}</AvatarFallback>
          </TooltipTrigger>
          <TooltipContent>{presence.name}</TooltipContent>
        </Tooltip>
      }
      @if (hiddenUsers > 0) {
        <AvatarGroupCount>+{hiddenUsers}</AvatarGroupCount>
      }
    </AvatarGroup>
  }
}
