import { useEffect } from 'react';
import { Badge } from '@repo/ui/components/badge';
import { Skeleton } from '@repo/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { contentModelQuery } from '#/content/model/functions';
import { importRunQuery } from '#/import/functions';
import { useAppRoute } from '#/use-app-route';

export function RunStep(props: { runId: string }) @{
  const { activeOrganization } = useAppRoute();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    ...importRunQuery(activeOrganization.id, props.runId),
    refetchInterval: (query) => (query.state.data?.status === 'running' ? 2000 : false),
  });

  // The sidebar lists the model; the new collections should appear in it the
  // moment the run settles.
  const status = data?.status;
  useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      void queryClient.invalidateQueries({
        queryKey: contentModelQuery(activeOrganization.id).queryKey,
      });
    }
  }, [status, queryClient, activeOrganization.id]);

  <div className="flex max-w-3xl flex-col gap-4">
    @if (data === undefined) {
      <Skeleton className="h-24 w-full" />
    }
    @if (data !== undefined) {
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {data.status === 'running'
                ? 'Importing…'
                : data.status === 'completed'
                  ? 'Import complete'
                  : 'Import failed'}
            </span>
            <span className="text-muted-foreground">
              {`${data.progress.imported + data.progress.failed + data.progress.skipped} of ${data.progress.total} pages`}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${
                  data.progress.total === 0
                    ? 0
                    : Math.round(
                        ((data.progress.imported + data.progress.failed + data.progress.skipped) /
                          data.progress.total) *
                          100,
                      )
                }%`,
              }}
            />
          </div>
          @if (data.progress.failed > 0) {
            <span className="text-xs text-muted-foreground">
              {`${data.progress.failed} ${data.progress.failed === 1 ? 'page' : 'pages'} failed; the report below says why.`}
            </span>
          }
          @if (data.error !== null) {
            <p className="text-sm text-destructive">{data.error}</p>
          }
        </div>
        @if (data.report.length > 0) {
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{"Page"}</TableHead>
                <TableHead>{"Type"}</TableHead>
                <TableHead>{"Result"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              @for (const item of data.report; key item.url) {
                <TableRow>
                  <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                    {new URL(item.url).pathname}
                  </TableCell>
                  <TableCell className="text-xs">{item.type}</TableCell>
                  <TableCell>
                    @if (item.status === 'imported') {
                      <Badge variant="secondary">{item.slug ?? 'imported'}</Badge>
                    }
                    @if (item.status === 'skipped') {
                      <span className="text-xs text-muted-foreground">
                        {item.error ?? 'Skipped'}
                      </span>
                    }
                    @if (item.status === 'failed') {
                      <span className="text-xs text-destructive">{item.error ?? 'Failed'}</span>
                    }
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        }
      </div>
    }
  </div>
}
