import { createFastModel } from '@repo/ai/model';
import type { Actor } from '@repo/audit';
import type { ImportItem } from '@repo/import/plan';
import { createModelFromPlan, importPage } from '@repo/import/run';
import type { CreatedType } from '@repo/import/run';
import { loadRunPlan, updateRun } from '@repo/import/status';
import { createLogger } from '@repo/logging';
import { WorkflowEntrypoint } from 'cloudflare:workers';
import type { WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

import type { WorkflowsEnv } from '../../env';
import { siteImport } from './definition';
import type { SiteImportParams } from './definition';

// Pages per step: small enough that a retried step redoes little, large
// enough that a run is not all step overhead.
const batchSize = 4;

// Started by the import wizard once the user approves the plan (see
// startImport in apps/web). Creates the planned types and fields, then walks
// the pages in batches: fetch, extract with the fast model, write the entry
// and its bodies. Progress and outcomes land on the import_run row after
// every batch, which is what the wizard polls.
export class SiteImportWorkflow extends WorkflowEntrypoint<WorkflowsEnv, SiteImportParams> {
  async run(event: Readonly<WorkflowEvent<SiteImportParams>>, step: WorkflowStep): Promise<void> {
    const { organizationId, runId } = siteImport.schema.parse(event.payload);
    const log = createLogger({
      workflow: { name: siteImport.name, instanceId: event.instanceId },
      organization: { id: organizationId },
    });
    try {
      const { plan, actor } = await step.do('load plan', () => loadRunPlan(organizationId, runId));
      const jobs = plan.types.flatMap((type, index) =>
        type.urls.map((url) => ({ type: index, url })),
      );

      const types = await step.do('create content model', () =>
        createModelFromPlan(organizationId, plan, actor),
      );

      // Pages already imported are replayed from cached step results, so a
      // resumed run picks up exactly where it stopped.
      const report: ImportItem[] = [];
      for (let start = 0; start < jobs.length; start += batchSize) {
        const batch = jobs.slice(start, start + batchSize);
        const items = await step.do(`import pages ${start + 1} to ${start + batch.length}`, () =>
          this.importBatch(organizationId, runId, types, batch, jobs.length, report, actor),
        );
        report.push(...items);
      }

      const counts = tally(report);
      await step.do('finish', () =>
        updateRun(runId, {
          status: 'completed',
          progress: { total: jobs.length, ...counts },
          report,
        }),
      );
      log.set({
        import: {
          runId,
          origin: plan.origin,
          pages: jobs.length,
          imported: counts.imported,
          failed: counts.failed,
        },
      });
    } catch (error) {
      // The wizard polls the row, so a dead workflow must not read "running".
      try {
        await updateRun(runId, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      } catch {
        // Marking is best-effort; the original error is the one to report.
      }
      throw error;
    } finally {
      log.emit();
    }
  }

  private async importBatch(
    organizationId: string,
    runId: string,
    types: CreatedType[],
    batch: { type: number; url: string }[],
    total: number,
    prior: ImportItem[],
    actor: Actor,
  ): Promise<ImportItem[]> {
    const model = createFastModel(this.env);
    const items: ImportItem[] = [];
    for (const job of batch) {
      items.push(await importPage(model, organizationId, types[job.type], job.url, actor));
    }
    const all = [...prior, ...items];
    await updateRun(runId, {
      progress: { total, ...tally(all) },
      report: all,
    });
    return items;
  }
}

function tally(items: ImportItem[]): { imported: number; failed: number; skipped: number } {
  return {
    imported: items.filter((item) => item.status === 'imported').length,
    failed: items.filter((item) => item.status === 'failed').length,
    skipped: items.filter((item) => item.status === 'skipped').length,
  };
}
