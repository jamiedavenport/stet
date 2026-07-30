import { canManageOrganization } from '@repo/auth/access';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { AuditPage } from '#/audit/audit-page.tsrx';
import { auditQuery } from '#/audit/functions';

export const Route = createFileRoute('/app/audit')({
  // Mirrors the server function's organizationAdminMiddleware: the log names
  // who did what, so for plain members the page does not exist.
  beforeLoad: ({ context }) => {
    if (!canManageOrganization(context.memberRole)) {
      throw notFound();
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(auditQuery(context.activeOrganization.id, 0)),
  component: AuditPage,
});
