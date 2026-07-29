import { createFileRoute } from '@tanstack/react-router';

import { EntryFieldEditor } from '#/content/entry/field-editor.tsrx';
import { entryQuery } from '#/content/entry/functions';

export const Route = createFileRoute('/app/c/$collection/$entry/$field')({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(
      entryQuery(context.activeOrganization.id, params.entry),
    );
  },
  component: EntryFieldEditor,
});
