import { createFileRoute } from '@tanstack/react-router';

import { mapEntryQuery, membersQuery } from '#/content/entry/functions';
import { MapEditor } from '#/content/map/editor.tsrx';

export const Route = createFileRoute('/app/m/$map/')({
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(mapEntryQuery(context.activeOrganization.id, params.map)),
      context.queryClient.ensureQueryData(membersQuery(context.activeOrganization.id)),
    ]);
  },
  component: MapEditor,
});
