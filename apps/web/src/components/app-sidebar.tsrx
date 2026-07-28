import { authClient } from '@repo/auth/client';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@repo/ui/components/sidebar';
import { Link, useRouter } from '@tanstack/react-router';
import { LogOutIcon } from 'lucide-react';
import { useAppRoute } from '#/use-app-route';

import { OrgSwitcher } from '#/organization/org-switcher.tsrx';
import { initials } from '#/initials';
import { imageSrc } from '#/files/urls';
import { navigationFor } from '#/navigation';
import { clearSessionContext, isPlatformAdmin } from '#/session';

export function AppSidebar() @{
  const { user, memberRole } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();

  const items = navigationFor({ memberRole, isPlatformAdmin: isPlatformAdmin(user) });

  <Sidebar collapsible="icon">
    <SidebarHeader>
      <OrgSwitcher />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            @for (const item of items; key item.to) {
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={item.label} render={<Link to={item.to} />}>
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            }
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip={"Sign out"}
            aria-label={"Sign out"}
            onClick={async () => {
              await authClient.signOut();
              clearSessionContext(queryClient);
              await router.invalidate();
            }}
          >
            <Avatar size="sm">
              <AvatarImage src={imageSrc(user.image, 64)} alt="" />
              <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
            <LogOutIcon className="ml-auto size-4" />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
}
