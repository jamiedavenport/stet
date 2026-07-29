import { Suspense } from 'react';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { SparklesIcon } from 'lucide-react';

import { useAssistant, useAssistantShortcut } from '#/ai/assistant-context.tsrx';
import { AssistantChat } from '#/ai/chat';
import { useAssistantLocation } from '#/ai/location';
import { orgBillingQuery } from '#/organization/functions';
import { useAppRoute } from '#/use-app-route';

/**
 * The assistant, docked beside the page so a conversation survives
 * navigating around the app. Closed it renders nothing, which is also what
 * keeps the agent WebSocket closed until someone asks for it.
 */
export function AssistantPanel() @{
  const { open } = useAssistant();
  const { activeOrganization, user } = useAppRoute();
  const location = useAssistantLocation();
  // The worker enforces the plan before routing to the agent; this query only
  // decides whether to show the chat or the upgrade note.
  const billing = useQuery({ ...orgBillingQuery(activeOrganization.id), enabled: open });

  <div className="contents">
    @if (open) {
      <aside className="hidden min-h-0 w-96 shrink-0 flex-col border-l md:flex">
        @if (billing.data === undefined) {
          <PanelSkeleton />
        }
        @if (billing.data !== undefined && !billing.data.features.ai) {
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <SparklesIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">{"The assistant is part of the paid plan"}</p>
            <p className="text-sm text-muted-foreground">
              {"Upgrade to build your model, draft content, and search with AI."}
            </p>
            <Button render={<Link to="/app/organization" />}>{"View plans"}</Button>
          </div>
        }
        @if (billing.data !== undefined && billing.data.features.ai) {
          <Suspense fallback={<PanelSkeleton />}>
            <AssistantChat
              name={`${activeOrganization.id}:${user.id}`}
              location={location}
            />
          </Suspense>
        }
      </aside>
    }
  </div>
}

// The chat hook suspends while it loads the stored conversation; without a
// boundary here that suspension would climb to the router's and flash the
// whole page (react's "switched to client rendering").
function PanelSkeleton() @{
  <div className="flex flex-1 flex-col gap-3 p-4">
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-8 w-full" />
    <Skeleton className="h-8 w-1/2" />
  </div>
}

/** The header button that summons the panel; also owns the Cmd+I binding. */
export function AssistantTrigger() @{
  const assistant = useAssistant();
  useAssistantShortcut(assistant.toggle);

  <Button
    variant="ghost"
    size="icon"
    className="size-7"
    aria-label={"Toggle the assistant"}
    aria-keyshortcuts="Meta+I Control+I"
    onClick={assistant.toggle}
  >
    <SparklesIcon />
  </Button>
}
