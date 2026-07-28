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
import { Link, useRouterState } from '@tanstack/react-router';
import { PlusIcon, SearchIcon } from 'lucide-react';

import { OrgSwitcher } from '#/organization/org-switcher.tsrx';
import { UserMenu } from '#/account/user-menu.tsrx';
import { isCurrent, sidebarNavigation } from '#/navigation';
import { useCommandMenu } from '#/search/command-menu-context.tsrx';
import { useAppRoute } from '#/use-app-route';

export function AppSidebar() @{
  const { memberRole } = useAppRoute();
  const commandMenu = useCommandMenu();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const groups = sidebarNavigation({ memberRole });

  <Sidebar collapsible="icon">
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
              @for (const item of group.items; key item.label) {
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={item.label}
                    isActive={isCurrent(pathname, item)}
                    render={<Link to={item.to} params={item.params} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              }
              @if (group.id === 'home') {
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={"Search"}
                    aria-keyshortcuts="Meta+K Control+K"
                    onClick={() => commandMenu.setOpen(true)}
                  >
                    <SearchIcon />
                    <span>{"Search"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              }
              @if (group.id === 'content') {
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={"New collection"}
                    className="text-muted-foreground"
                    render={<Link to="/app/model" />}
                  >
                    <PlusIcon />
                    <span>{"New"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
