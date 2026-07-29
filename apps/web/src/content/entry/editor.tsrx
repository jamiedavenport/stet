import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { ChevronLeftIcon } from 'lucide-react';

import { entriesQuery, entryQuery } from '#/content/entry/functions';
import { EntryWorkspace } from '#/content/entry/workspace.tsrx';
import { contentModelQuery } from '#/content/model/functions';
import { useAppRoute } from '#/use-app-route';

const route = getRouteApi('/app/c/$collection/$entry');

export function EntryEditor() @{
  const { activeOrganization } = useAppRoute();
  const params = route.useParams();
  const { data } = useSuspenseQuery(entryQuery(activeOrganization.id, params.entry));
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

  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
    <Link
      to="/app/c/$collection"
      params={{ collection: data.type.slug }}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" />
      {data.type.name}
    </Link>
    <EntryWorkspace
      type={data.type}
      entry={data.entry}
      presencePage={`/app/c/${data.type.slug}`}
      onChanged={onChanged}
    />
  </div>
}
