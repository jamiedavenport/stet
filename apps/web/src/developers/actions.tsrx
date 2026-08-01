import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';

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

  <div className="flex w-full max-w-2xl flex-col gap-6">
    <PageHeader
      title={"Actions"}
      description={"Update downstream code before removing deprecated field keys."}
    />
    <Card>
      <CardHeader>
        <CardTitle>{"Field migrations"}</CardTitle>
      </CardHeader>
      <CardContent>
        @if (data.length === 0) {
          <p className="text-base text-pretty text-muted-foreground sm:text-sm">{"No downstream migrations need attention."}</p>
        } @else {
          <ul role="list" className="flex flex-col divide-y">
            @for (const action of data; key action.id) {
              <ActionRow
                action={action}
                relatedKeys={data.filter((candidate) => candidate.fieldId === action.fieldId).map((candidate) => candidate.key)}
                onCompleted={refresh}
              />
            }
          </ul>
        }
      </CardContent>
    </Card>
  </div>
}
