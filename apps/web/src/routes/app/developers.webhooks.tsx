import { canManageOrganization } from '@repo/auth/access';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { WebhooksPage } from '#/webhooks/webhooks-page.tsrx';
import { webhooksQuery } from '#/webhooks/functions';

export const Route = createFileRoute('/app/developers/webhooks')({
  // Mirrors the server functions' organizationAdminMiddleware: for members
  // the page does not exist. The sidebar hides the link on the same rule.
  beforeLoad: ({ context }) => {
    if (!canManageOrganization(context.memberRole)) {
      throw notFound();
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(webhooksQuery(context.activeOrganization.id)),
  component: WebhooksPage,
});
