import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@repo/ui/components/sidebar';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';

import { NotificationBell } from '#/notifications/notification-bell.tsrx';
import { OrgSwitcher } from '#/organization/org-switcher.tsrx';
import { UserMenu } from '#/account/user-menu.tsrx';
import { contentModelQuery } from '#/content/model/functions';
import { NewContentMenu } from '#/content/model/new-menu.tsrx';
import { isCurrent, navPath, sidebarNavigation } from '#/navigation';
import { useCommandMenu } from '#/search/command-menu-context.tsrx';
import { useAppRoute } from '#/use-app-route';

export function AppSidebar() @{
  const { activeOrganization, memberRole } = useAppRoute();
  const commandMenu = useCommandMenu();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: model } = useSuspenseQuery(contentModelQuery(activeOrganization.id));

  const groups = sidebarNavigation({ memberRole, content: model.types });

  <Sidebar collapsible="icon" variant="inset">
    <SidebarHeader>
      <OrgSwitcher />
    </SidebarHeader>
    <SidebarContent>
      @for (const group of groups; key group.id) {
        <SidebarGroup>
          @if (group.label !== undefined) {
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          }
          <SidebarGroupContent>
            <SidebarMenu>
              @for (const item of group.items; key navPath(item)) {
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={isCurrent(pathname, item)}
                    render={<Link to={item.to} params={item.params} />}
                  >
                    <item.icon weight="duotone" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              }
              @if (group.id === 'home') {
                <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={"Search"}
                    aria-keyshortcuts="Meta+K Control+K"
                    onClick={() => commandMenu.setOpen(true)}
                  >
                    <MagnifyingGlassIcon weight="duotone" />
                    <span>{"Search"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <NotificationBell />
                </>
              }
              @if (group.id === 'content') {
                <NewContentMenu />
              }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      }
    </SidebarContent>
    <SidebarFooter>
      <UserMenu />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
}
