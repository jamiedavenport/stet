import { listAudit } from '@repo/audit';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { organizationAdminMiddleware } from '#/session';

export const auditPageSize = 50;

// Reading the log is an organization-administration surface, like webhooks:
// it names who changed what, which is not every member's business.
const getAudit = createServerFn({ method: 'GET' })
  .middleware([organizationAdminMiddleware])
  .validator(z.object({ page: z.number().int().min(0) }))
  .handler(async ({ data, context }) =>
    listAudit(context.organizationId, {
      limit: auditPageSize,
      offset: data.page * auditPageSize,
    }),
  );

export type AuditData = Awaited<ReturnType<typeof getAudit>>;
export type AuditRow = AuditData['entries'][number];

export const auditQuery = (organizationId: string, page: number) =>
  queryOptions({
    queryKey: ['audit', organizationId, page],
    queryFn: () => getAudit({ data: { page } }),
    staleTime: 15_000,
  });
