import { and, database, eq, schema } from '@repo/db';

import { importPlanSchema } from './plan';
import type { ImportItem, ImportPlan, ImportProgress, ImportRunStatus } from './plan';

// Reading and writing the import_run row: the workflow's progress feed and
// the wizard's report, one row per run.

export async function loadRunPlan(organizationId: string, runId: string): Promise<ImportPlan> {
  const db = await database();
  const row = await db.query.importRun.findFirst({
    where: and(eq(schema.importRun.id, runId), eq(schema.importRun.organizationId, organizationId)),
  });
  if (row === undefined) {
    throw new Error(`Import run ${runId} not found`);
  }
  return importPlanSchema.parse(JSON.parse(row.plan));
}

export async function updateRun(
  runId: string,
  patch: {
    status?: ImportRunStatus;
    progress?: ImportProgress;
    report?: ImportItem[];
    error?: string;
  },
): Promise<void> {
  const db = await database();
  await db
    .update(schema.importRun)
    .set({
      ...(patch.status === undefined ? {} : { status: patch.status }),
      ...(patch.progress === undefined ? {} : { progress: JSON.stringify(patch.progress) }),
      ...(patch.report === undefined ? {} : { report: JSON.stringify(patch.report) }),
      ...(patch.error === undefined ? {} : { error: patch.error }),
      updatedAt: new Date(),
    })
    .where(eq(schema.importRun.id, runId));
}
