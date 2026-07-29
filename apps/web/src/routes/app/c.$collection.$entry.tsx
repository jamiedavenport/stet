import { createFileRoute } from '@tanstack/react-router';

import { EntryEditor } from '#/content/entry/editor.tsrx';
import { entryQuery, membersQuery } from '#/content/entry/functions';

export const Route = createFileRoute('/app/c/$collection/$entry')({
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(entryQuery(context.activeOrganization.id, params.entry)),
      context.queryClient.ensureQueryData(membersQuery(context.activeOrganization.id)),
    ]);
  },
  component: EntryEditor,
});
