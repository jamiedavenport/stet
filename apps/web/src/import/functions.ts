import { createChatModel, createFastModel } from '@repo/ai/model';
import { ai } from '@repo/billing/server';
import { and, database, eq, schema } from '@repo/db';
import { discoverSite as discover } from '@repo/import/discover';
import { extractEntry } from '@repo/import/extract';
import type { ExtractedEntry } from '@repo/import/extract';
import { fetchPage } from '@repo/import/page';
import type { FetchedPage } from '@repo/import/page';
import {
  importItemSchema,
  importPlanSchema,
  importProgressSchema,
  plannedTypeSchema,
} from '@repo/import/plan';
import type { ImportRunStatus } from '@repo/import/plan';
import { proposeModel } from '@repo/import/propose';
import { startWorkflow } from '@repo/workflows/client';
import { queryOptions } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

import { organizationMiddleware } from '#/session';

export type { DiscoveredGroup, Discovery } from '@repo/import/discover';
export type { ImportItem, ImportPlan, PlannedField, PlannedType } from '@repo/import/plan';
export type { ExtractedEntry } from '@repo/import/extract';

/** Pages per run, a demo-sized ceiling; raise it when imports earn a ledger. */
const importPageCap = 150;
const samplesPerGroup = 2;
const sampleContentCap = 12_000;

export const discoverImportSite = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ url: z.string().min(1).max(200) }))
  .handler(async ({ data }) => discover(data.url));

const groupInputSchema = z.object({
  id: z.string().max(120),
  pattern: z.string().max(200),
  urls: z.array(z.string().url()).min(1).max(300),
  hubUrl: z.string().url().optional(),
  note: z.string().max(300).optional(),
});

export const proposeImportModel = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(
    z.object({ origin: z.string().url(), groups: z.array(groupInputSchema).min(1).max(8) }),
  )
  .handler(async ({ data, context }) => {
    await ai.require(context.organizationId);
    const groups = await Promise.all(
      data.groups.map(async (group) => ({ ...group, samples: await samplePages(group.urls) })),
    );
    return proposeModel(createChatModel(env), { origin: data.origin, groups });
  });

/** The first and a middle page: templates drift, so one sample lies. */
async function samplePages(urls: string[]): Promise<FetchedPage[]> {
  const picks =
    urls.length <= samplesPerGroup ? urls : [urls[0], urls[Math.floor(urls.length / 2)]];
  const pages = await Promise.all(
    picks.map(async (url) => {
      try {
        return await fetchPage(url, sampleContentCap);
      } catch {
        return null;
      }
    }),
  );
  return pages.filter((page): page is FetchedPage => page !== null);
}

export type ExtractionPreview = {
  url: string;
  entry: ExtractedEntry | null;
  error: string | null;
};

export const previewImportExtraction = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ type: plannedTypeSchema }))
  .handler(async ({ data, context }): Promise<ExtractionPreview[]> => {
    await ai.require(context.organizationId);
    const model = createFastModel(env);
    return Promise.all(
      data.type.urls.slice(0, samplesPerGroup).map(async (url) => {
        try {
          const page = await fetchPage(url);
          return { url, entry: await extractEntry(model, { page, type: data.type }), error: null };
        } catch (error) {
          return { url, entry: null, error: error instanceof Error ? error.message : 'Failed' };
        }
      }),
    );
  });

export const startImport = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .validator(z.object({ plan: importPlanSchema }))
  .handler(async ({ data, context }) => {
    await ai.require(context.organizationId);
    const total = data.plan.types.reduce((sum, type) => sum + type.urls.length, 0);
    if (total > importPageCap) {
      throw new Error(`An import is capped at ${importPageCap} pages; this plan has ${total}`);
    }
    const db = await database();
    const runId = crypto.randomUUID();
    await db.insert(schema.importRun).values({
      id: runId,
      organizationId: context.organizationId,
      origin: data.plan.origin,
      status: 'running',
      plan: JSON.stringify(data.plan),
      progress: JSON.stringify({ total, imported: 0, failed: 0 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // The run id doubles as the instance id, so a retried submit cannot
    // start a second workflow for the same row.
    await startWorkflow(
      'site-import',
      { organizationId: context.organizationId, runId },
      { id: runId },
    );
    return { runId };
  });

const getImportRun = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .validator(z.object({ runId: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    const row = await db.query.importRun.findFirst({
      where: and(
        eq(schema.importRun.id, data.runId),
        eq(schema.importRun.organizationId, context.organizationId),
      ),
    });
    if (row === undefined) {
      throw notFound();
    }
    return {
      id: row.id,
      origin: row.origin,
      status: row.status as ImportRunStatus,
      progress: importProgressSchema.parse(JSON.parse(row.progress)),
      report: z.array(importItemSchema).parse(JSON.parse(row.report)),
      error: row.error,
    };
  });

export type ImportRun = Awaited<ReturnType<typeof getImportRun>>;

export const importRunQuery = (organizationId: string, runId: string) =>
  queryOptions({
    queryKey: ['import-run', organizationId, runId],
    queryFn: () => getImportRun({ data: { runId } }),
  });
