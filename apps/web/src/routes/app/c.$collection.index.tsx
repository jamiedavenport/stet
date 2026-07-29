import { createFileRoute } from '@tanstack/react-router';

import { CollectionEntries } from '#/content/collection/entries.tsrx';
import { entriesQuery, membersQuery } from '#/content/entry/functions';

export const Route = createFileRoute('/app/c/$collection/')({
  loader: async ({ params, context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        entriesQuery(context.activeOrganization.id, params.collection),
      ),
      context.queryClient.ensureQueryData(membersQuery(context.activeOrganization.id)),
    ]);
  },
  component: CollectionEntries,
});
