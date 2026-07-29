import { createFileRoute } from '@tanstack/react-router';

import { mapEntryQuery } from '#/content/entry/functions';
import { MapFieldEditor } from '#/content/map/field-editor.tsrx';

export const Route = createFileRoute('/app/m/$map/$field')({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(
      mapEntryQuery(context.activeOrganization.id, params.map),
    );
  },
  component: MapFieldEditor,
});
