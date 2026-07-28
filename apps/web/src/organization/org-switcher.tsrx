import { authClient } from '@repo/auth/client';
import { useQueryClient } from '@tanstack/react-query';
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
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react';
import { useAppRoute } from '#/use-app-route';
import { clearSessionContext } from '#/session';

export function OrgSwitcher() @{
  const { organizations, activeOrganization } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isMobile } = useSidebar();

  const switchOrganization = async (organizationId: string) => {
    if (organizationId === activeOrganization.id) return;
    await authClient.organization.setActive({ organizationId });
    clearSessionContext(queryClient);
    await router.invalidate();
  };

  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground uppercase">
            {activeOrganization.name.charAt(0)}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{activeOrganization.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {activeOrganization.slug}
            </span>
          </div>
          <ChevronsUpDownIcon className="ml-auto size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56"
          align="start"
          side={isMobile ? 'bottom' : 'right'}
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>{"Organizations"}</DropdownMenuLabel>
            @for (const org of organizations; key org.id) {
              <DropdownMenuItem onClick={() => void switchOrganization(org.id)}>
                {org.name}
                {org.id === activeOrganization.id ? <CheckIcon className="ml-auto" /> : null}
              </DropdownMenuItem>
            }
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/orgs/new" />}>
            <PlusIcon />
            {"New organization"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
}
