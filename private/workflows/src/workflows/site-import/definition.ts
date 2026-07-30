import { z } from 'zod';

import { defineWorkflow } from '../../define.ts';

export const siteImport = defineWorkflow({
  name: 'site-import',
  binding: 'SITE_IMPORT',
  className: 'SiteImportWorkflow',
  schema: z.object({
    organizationId: z.string(),
    /** The import_run row holding the plan; also the workflow instance id. */
    runId: z.string(),
  }),
});

export type SiteImportParams = z.output<typeof siteImport.schema>;
