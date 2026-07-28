import { brand } from '@repo/brand';
import { PageRoomProvider } from '@repo/realtime/client';
import { Separator } from '@repo/ui/components/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@repo/ui/components/sidebar';
import { TooltipProvider } from '@repo/ui/components/tooltip';
import { Outlet, createFileRoute, redirect, useRouterState } from '@tanstack/react-router';

import { AppSidebar } from '#/components/app-sidebar.tsrx';
import { CommandMenu } from '#/search/command-menu';
import { ImpersonationBanner } from '#/admin/impersonation-banner.tsrx';
import { NotificationBell } from '#/notifications/notification-bell.tsrx';
import { PagePresence } from '#/components/page-presence.tsrx';
import {
  ensureActiveMember,
  ensureOrganizations,
  requireSession,
  setActiveOrganization,
} from '#/session';

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ context, location }) => {
    const { session } = context;
    requireSession(session, location);

    const organizations = await ensureOrganizations(context.queryClient);

    if (organizations.length === 0) {
      throw redirect({ to: '/orgs/new' });
    }

    const activeOrganizationId = session.session.activeOrganizationId;
    let activeOrganization = organizations.find((org) => org.id === activeOrganizationId);
    if (activeOrganization === undefined) {
      // The session can outlive its active organization (left, removed, or
      // deleted). Switch it server-side so every org-scoped call downstream
      // agrees with the organization this layout renders.
      activeOrganization = organizations[0];
      await setActiveOrganization({ data: activeOrganization.id });
    }

    const member = await ensureActiveMember(context.queryClient, activeOrganization.id);

    return { session, organizations, activeOrganization, memberRole: member.role };
  },
  component: AppLayout,
});

function AppLayout() {
  const { session } = Route.useRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const user = session.user;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {/* One room (and one WebSocket) per page; presence and page
              features all consume it through context. */}
          <PageRoomProvider
            page={pathname}
            user={{ id: user.id, image: user.image ?? null, name: user.name }}
          >
            <ImpersonationBanner />
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 max-h-4" />
              <p className="text-sm font-medium">{brand.name}</p>
              <div className="ml-auto flex items-center gap-2">
                <PagePresence />
                <CommandMenu />
                <NotificationBell />
              </div>
            </header>
            <div className="flex flex-1 flex-col p-4">
              <Outlet />
            </div>
          </PageRoomProvider>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
