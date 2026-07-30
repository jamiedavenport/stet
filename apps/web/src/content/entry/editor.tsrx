import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { entriesQuery, entryQuery } from '#/content/entry/functions';
import { EntryHistory } from '#/content/entry/history.tsrx';
import { EntryWorkspace } from '#/content/entry/workspace.tsrx';
import { contentModelQuery } from '#/content/model/functions';
import { useAppRoute } from '#/use-app-route';

const route = getRouteApi('/app/c/$collection/$entry/');

export function EntryEditor() @{
  const { activeOrganization } = useAppRoute();
  const params = route.useParams();
  const { data } = useSuspenseQuery(entryQuery(activeOrganization.id, params.entry));
  useBreadcrumbs([
    { label: data.type.name, to: '/app/c/$collection', params: { collection: data.type.slug } },
    { label: data.entry.title },
  ]);
  const queryClient = useQueryClient();

  const onChanged = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: entryQuery(activeOrganization.id, params.entry).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: entriesQuery(activeOrganization.id, data.type.slug).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: contentModelQuery(activeOrganization.id).queryKey,
      }),
    ]);
  };

  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
    <EntryWorkspace
      type={data.type}
      entry={data.entry}
      lookup={data.lookup}
      presencePage={`/app/c/${data.type.slug}`}
      onChanged={onChanged}
    />
    <EntryHistory entryId={data.entry.id} onRestored={onChanged} />
  </div>
}
