import { useEffect } from 'react';
import { contentTypePage } from '@repo/content/rooms';
import { usePageRoom } from '@repo/realtime/client';
import { entryPage } from '@repo/realtime/entry';
import { useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { BodyEditor } from '#/content/body/editor.tsrx';
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
  useBreadcrumbs([
    { label: data.type.name, to: '/app/m/$map', params: { map: data.type.slug } },
    { label: field?.name ?? 'Field' },
  ]);

  const { room: presenceRoom } = usePageRoom({
    page: contentTypePage(data.type),
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

  {/* Cancels the page padding: the editor is the whole page, edge to edge. */}
  <div className="-m-6 flex min-h-0 min-w-0 flex-1 flex-col">
    @if (field === undefined) {
      <p className="p-6 text-sm text-muted-foreground">
        {"This key does not exist or is not rich text."}
      </p>
    }
    @if (field !== undefined && bodyRoom !== null) {
      <BodyEditor room={bodyRoom} user={presenceUser} field={field} />
    }
  </div>
}
