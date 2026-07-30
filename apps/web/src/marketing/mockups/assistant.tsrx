import { ArrowUpIcon, CheckIcon, SparkleIcon, XIcon } from '@phosphor-icons/react';
import { cn } from '@repo/ui/lib/utils';

import { MockCrumbs, MockShell, MockTypeHeader } from '#/marketing/mockups/frame.tsrx';

const bodyWidths = ['w-full', 'w-11/12', 'w-4/5', 'w-full', 'w-2/3'];

// The assistant docked beside the work, mid-task. Anything that writes to the
// model stops for a human first, which is why the approval card is the
// centre of this mockup rather than a detail in it.

function UserMessage({ children }: { children: string }) @{
  <div className="flex justify-end">
    <p className="max-w-[85%] rounded-lg rounded-br-sm bg-secondary px-3 py-2 text-sm text-pretty">
      {children}
    </p>
  </div>
}

function AssistantMessage({ children }: { children: string }) @{
  <p className="text-sm text-pretty">{children}</p>
}

/** A write the agent proposed, waiting on the editor to allow it. */
function ApprovalCard() @{
  <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
    <div className="flex items-center justify-between gap-2 bg-muted/60 px-3 py-2">
      <p className="truncate text-sm font-medium">Add a field</p>
      <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        Needs you
      </span>
    </div>
    <dl className="flex flex-col gap-1 px-3 py-2.5 font-mono text-xs">
      <div className="flex gap-2">
        <dt className="w-20 shrink-0 text-muted-foreground">collection</dt>
        <dd className="min-w-0 flex-1 truncate text-blue-600 dark:text-blue-400">posts</dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-20 shrink-0 text-muted-foreground">name</dt>
        <dd className="min-w-0 flex-1 truncate text-emerald-600 dark:text-emerald-400">
          Reading time
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="w-20 shrink-0 text-muted-foreground">type</dt>
        <dd className="min-w-0 flex-1 truncate text-amber-600 dark:text-amber-400">number</dd>
      </div>
    </dl>
    <div className="flex items-center gap-2 border-t border-border px-3 py-2">
      <span className="flex h-7 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground">
        <CheckIcon className="size-3.5" />
        Approve
      </span>
      <span className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground">
        <XIcon className="size-3.5" />
        Decline
      </span>
    </div>
  </div>
}

function AssistantChat() @{
  <div className="flex flex-1 flex-col">
    <div className="flex h-11 items-center gap-2 border-b border-border px-3">
      <SparkleIcon weight="duotone" className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
      <p className="min-w-0 flex-1 truncate text-sm font-medium">Assistant</p>
      <XIcon className="size-4 shrink-0 text-muted-foreground" />
    </div>
    <div className="flex flex-1 flex-col gap-4 p-3">
      <UserMessage>Add a reading time to posts and fill it in for the drafts.</UserMessage>
      <AssistantMessage>
        Reading time is not on the model yet, so I will add it as a number field first.
      </AssistantMessage>
      <ApprovalCard />
      <AssistantMessage>
        Once that lands I will estimate each draft from its body and write the values back.
      </AssistantMessage>
    </div>
    <div className="p-3">
      <div className="flex items-end gap-2 rounded-lg p-2 ring-1 ring-foreground/10">
        <p className="min-w-0 flex-1 py-1 text-sm text-muted-foreground">Ask anything</p>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ArrowUpIcon className="size-3.5" />
        </span>
      </div>
    </div>
  </div>
}

/**
 * The assistant working inside the same session as the editors: it reads the
 * model, proposes the change, and waits to be allowed to make it.
 */
export function AssistantMockup() @{
  <MockShell aside={<AssistantChat />}>
    <MockCrumbs trail={['Content', 'Posts']} />
    <div className="flex flex-1 flex-col pt-6">
      <MockTypeHeader name="Posts" slug="posts" />
      <div className="flex flex-col gap-3 p-6">
        @for (const width of bodyWidths; index i; key i) {
          <div className={cn('h-3 rounded-full bg-muted', width)} />
        }
      </div>
    </div>
  </MockShell>
}
