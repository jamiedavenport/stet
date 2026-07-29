import { useEffect } from 'react';
import { usePageRoom } from '@repo/realtime/client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { ChevronLeftIcon } from 'lucide-react';

import { BodyEditor } from '#/content/body/editor.tsrx';
import { entryPage } from '#/content/body/doc';
import { mapEntryQuery } from '#/content/entry/functions';
import { setCellLocation } from '#/content/presence';
import { useAppRoute } from '#/use-app-route';

const route = getRouteApi('/app/m/$map/$field');

/** The collaborative editor for one rich text key of a map. */
export function MapFieldEditor() @{
  const { activeOrganization, user } = useAppRoute();
  const params = route.useParams();
  const { data } = useSuspenseQuery(mapEntryQuery(activeOrganization.id, params.map));
  const presenceUser = { id: user.id, image: user.image ?? null, name: user.name };

  const field = data.type.fields.find(
    (candidate) => candidate.key === params.field && candidate.type === 'rich_text',
  );

  const { room: presenceRoom } = usePageRoom({
    page: `/app/m/${data.type.slug}`,
    user: presenceUser,
  });
  const { room: bodyRoom } = usePageRoom({ page: entryPage(data.entry.id), user: presenceUser });

  // Editing here is editing that row: show it on the map's key/value table.
  const entryId = data.entry.id;
  const fieldKey = field?.key;
  useEffect(() => {
    if (presenceRoom === null || fieldKey === undefined) {
      return;
    }
    setCellLocation(presenceRoom, { entryId, fieldKey });
    return () => {
      setCellLocation(presenceRoom, null);
    };
  }, [presenceRoom, entryId, fieldKey]);

  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
    <Link
      to="/app/m/$map"
      params={{ map: data.type.slug }}
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4" />
      {data.type.name}
    </Link>
    @if (field === undefined) {
      <p className="text-sm text-muted-foreground">
        {"This key does not exist or is not rich text."}
      </p>
    }
    @if (field !== undefined && bodyRoom !== null) {
      <BodyEditor room={bodyRoom} user={presenceUser} field={field} />
    }
  </div>
}
