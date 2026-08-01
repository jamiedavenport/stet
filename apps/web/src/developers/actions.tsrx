import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';
import { ActionRow } from '#/developers/action-row.tsrx';
import { actionCountQuery, actionsQuery } from '#/developers/deprecations';
import { useAppRoute } from '#/use-app-route';

export function Actions() @{
  useBreadcrumbs([{ label: 'Actions' }]);
  const { activeOrganization } = useAppRoute();
  const query = actionsQuery(activeOrganization.id);
  const { data } = useSuspenseQuery(query);
  const queryClient = useQueryClient();

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: query.queryKey }),
      queryClient.invalidateQueries({
        queryKey: actionCountQuery(activeOrganization.id).queryKey,
      }),
    ]);
  };

  <div className="flex w-full max-w-5xl flex-col gap-6">
    <PageHeader
      title={"Actions"}
      description={"Update downstream code before removing deprecated field keys."}
    />
    @if (data.length === 0) {
      <p className="border-t py-10 text-base text-pretty text-muted-foreground sm:text-sm">
        {"No downstream migrations need attention."}
      </p>
    } @else {
      <div className="-mx-6 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
        <Table className="border-b">
          <TableHeader>
            <TableRow>
              <TableHead>{"Field"}</TableHead>
              <TableHead>{"Content type"}</TableHead>
              <TableHead>{"Change"}</TableHead>
              <TableHead>{"Note"}</TableHead>
              <TableHead>
                <span className="sr-only">{"Actions"}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            @for (const action of data; key action.id) {
              <ActionRow
                action={action}
                relatedKeys={data.filter((candidate) => candidate.fieldId === action.fieldId).map((candidate) => candidate.key)}
                onCompleted={refresh}
              />
            }
          </TableBody>
        </Table>
      </div>
    }
  </div>
}
