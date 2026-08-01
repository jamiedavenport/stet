import { createFileRoute } from '@tanstack/react-router';

import { Actions } from '#/developers/actions.tsrx';
import { actionsQuery } from '#/developers/deprecations';

export const Route = createFileRoute('/app/developers/actions')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(actionsQuery(context.activeOrganization.id)),
  component: Actions,
});
