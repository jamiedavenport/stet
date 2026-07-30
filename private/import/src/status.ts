import type { Actor } from '@repo/audit';
import { and, database, eq, schema } from '@repo/db';

import { importPlanSchema } from './plan';
import type { ImportItem, ImportPlan, ImportProgress, ImportRunStatus } from './plan';

// Reading and writing the import_run row: the workflow's progress feed and
// the wizard's report, one row per run.

/**
 * The frozen plan and who approved it. Everything the run writes is
 * attributed to that person through the import surface, so an import is one
 * legible act in the audit log rather than anonymous machine work.
 */
export async function loadRunPlan(
  organizationId: string,
  runId: string,
): Promise<{ plan: ImportPlan; actor: Actor }> {
  const db = await database();
  const row = await db.query.importRun.findFirst({
    where: and(eq(schema.importRun.id, runId), eq(schema.importRun.organizationId, organizationId)),
  });
  if (row === undefined) {
    throw new Error(`Import run ${runId} not found`);
  }
  return {
    plan: importPlanSchema.parse(JSON.parse(row.plan)),
    actor: { userId: row.startedBy, via: 'import' },
  };
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
