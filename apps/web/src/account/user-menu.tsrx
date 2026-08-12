import { authClient } from '@repo/auth/client';
import { brand } from '@repo/brand';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@repo/ui/components/sidebar';
import { Link, useRouter } from '@tanstack/react-router';
import { BookOpenIcon, CaretUpDownIcon, SignOutIcon } from '@phosphor-icons/react';

import { accountNavigation } from '#/navigation';
import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';
import { clearSessionContext, isPlatformAdmin } from '#/session';
import { useAppRoute } from '#/use-app-route';

export function UserMenu() @{
  const { user } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile } = useSidebar();

  const items = accountNavigation({ isPlatformAdmin: isPlatformAdmin(user) });

  const signOut = async () => {
    await authClient.signOut();
    clearSessionContext(queryClient);
    await router.invalidate();
  };

  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={"Account menu"} render={<SidebarMenuButton size="lg" />}>
          <Avatar size="sm">
            <AvatarImage src={imageSrc(user.image, 64)} alt="" />
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
          <CaretUpDownIcon className="ml-auto size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56"
          align="end"
          side={isMobile ? 'bottom' : 'right'}
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="grid text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            @for (const item of items; key item.label) {
              <DropdownMenuItem render={<Link to={item.to} />}>
                <item.icon />
                {item.label}
              </DropdownMenuItem>
            }
            <DropdownMenuItem
              render={<a href={brand.docs} target="_blank" rel="noreferrer" />}
            >
              <BookOpenIcon />
              {"Documentation"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()}>
            <SignOutIcon />
            {"Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
}
