import { useState } from 'react';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { useSuspenseQuery } from '@tanstack/react-query';

import { auditPageSize, auditQuery } from '#/audit/functions';
import type { AuditRow } from '#/audit/functions';
import { auditSentence, viaLabels } from '#/audit/vocabulary';
import { useBreadcrumbs } from '#/components/breadcrumbs';
import { timeAgo } from '#/time';
import { useAppRoute } from '#/use-app-route';

/** Every change to the organization's content and model, newest first. */
export function AuditPage() @{
  useBreadcrumbs([{ label: 'Audit log' }]);
  const { activeOrganization } = useAppRoute();
  const [page, setPage] = useState(0);
  const { data } = useSuspenseQuery(auditQuery(activeOrganization.id, page));

  const from = page * auditPageSize + 1;
  const to = page * auditPageSize + data.entries.length;

  <div className="flex w-full max-w-3xl flex-col gap-4">
    <Card>
      <CardHeader>
        <CardTitle>{"Audit log"}</CardTitle>
        <CardDescription>
          {"Every change to this organization's content and model, whoever made it and wherever it came from."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        @if (data.entries.length === 0) {
          <p className="text-sm text-muted-foreground">{"Nothing has changed yet."}</p>
        } @else {
          <>
          <ul className="flex flex-col divide-y">
            @for (const row of data.entries; key row.id) {
              <AuditEntryRow row={row} />
            }
          </ul>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground tabular-nums">
              {`${from} to ${to} of ${data.total}`}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                {"Previous"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={to >= data.total}
                onClick={() => setPage(page + 1)}
              >
                {"Next"}
              </Button>
            </div>
          </div>
          </>
        }
      </CardContent>
    </Card>
  </div>
}

function AuditEntryRow({ row }: { row: AuditRow }) @{
  <li className="flex items-baseline gap-2 py-2 text-sm">
    <span className="flex-1">
      <span className="font-medium">{row.actor?.name ?? "Someone"}</span>
      {` ${auditSentence(row)} `}
      <span className="text-muted-foreground">{row.subject.label}</span>
    </span>
    @if (row.via !== 'app') {
      <Badge variant="outline" className="shrink-0">{viaLabels[row.via]}</Badge>
    }
    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(row.createdAt)}</span>
  </li>
}
