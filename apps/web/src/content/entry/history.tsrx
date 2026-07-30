import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react';

import { restoreRevision, revisionsQuery } from '#/content/entry/history-functions';
import type { Revision } from '#/content/entry/history-functions';
import { timeAgo } from '#/time';
import { useAppRoute } from '#/use-app-route';

const viaLabels: Record<Revision['via'], string> = {
  app: 'edited',
  editor: 'wrote',
  ai: 'edited with AI',
  import: 'imported',
  restore: 'restored',
  system: 'changed',
};

/**
 * The entry's version history. Collapsed by default: a restore is rare next to
 * writing, so it stays out of the way until asked for. Loads only when opened.
 */
export function EntryHistory(props: { entryId: string; onRestored: () => Promise<void> }) @{
  const { activeOrganization } = useAppRoute();
  const [open, setOpen] = useState(false);

  <section className="rounded-xl border">
    <Button
      variant="ghost"
      className="w-full justify-start gap-2 rounded-xl"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
    >
      <ClockCounterClockwiseIcon className="size-4" />
      {"History"}
    </Button>
    @if (open) {
      <RevisionList
        organizationId={activeOrganization.id}
        entryId={props.entryId}
        onRestored={props.onRestored}
      />
    }
  </section>
}

function RevisionList(props: {
  organizationId: string;
  entryId: string;
  onRestored: () => Promise<void>;
}) @{
  const queryClient = useQueryClient();
  const revisions = useQuery(revisionsQuery(props.organizationId, props.entryId));
  const [restoring, setRestoring] = useState<string | null>(null);

  const restore = async (revisionId: string) => {
    setRestoring(revisionId);
    try {
      await restoreRevision({ data: { revisionId } });
      await props.onRestored();
      await queryClient.invalidateQueries({
        queryKey: revisionsQuery(props.organizationId, props.entryId).queryKey,
      });
    } finally {
      setRestoring(null);
    }
  };

  <div className="border-t px-4 py-3">
    @if (revisions.isPending) {
      <p className="text-sm text-muted-foreground">{"Loading…"}</p>
    }
    @if (revisions.data !== undefined) {
      <ul className="flex flex-col">
        @for (const revision of revisions.data; key revision.id) {
          <li className="flex items-baseline gap-2 py-1.5 text-sm">
            <span className="flex-1 truncate">
              <span className="text-muted-foreground">
                {revision.author?.name ?? "Someone"}
                {" "}
                {viaLabels[revision.via]}
                {" "}
              </span>
              {revision.title}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {timeAgo(revision.createdAt)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={restoring !== null}
              onClick={() => void restore(revision.id)}
            >
              {restoring === revision.id ? "Restoring…" : "Restore"}
            </Button>
          </li>
        } @empty {
          <p className="text-sm text-muted-foreground">
            {"No history yet. Every save from here on adds a version."}
          </p>
        }
      </ul>
    }
  </div>
}
