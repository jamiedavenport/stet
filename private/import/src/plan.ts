import { z } from 'zod';

// The shapes the import wizard and the site-import workflow exchange: a plan
// is the reviewed model the user approved, frozen into the import_run row;
// progress and items are what the workflow writes back as it works.

/**
 * The field types an import can populate: the model's types minus the ones
 * whose values are ids of things that already exist here, which no source
 * site can supply — `person`, `asset`, and the reference types.
 */
export const importableFieldTypes = [
  'text',
  'rich_text',
  'number',
  'checkbox',
  'date',
  'select',
  'multi_select',
  'link',
] as const;

export type ImportableFieldType = (typeof importableFieldTypes)[number];

export const plannedFieldSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(importableFieldTypes),
  /** Where on the page the value lives, in the proposer's words; fed back to extraction. */
  hint: z.string().max(300),
});

export type PlannedField = z.infer<typeof plannedFieldSchema>;

export const plannedTypeSchema = z.object({
  kind: z.enum(['collection', 'map']),
  name: z.string().min(1).max(80),
  urls: z.array(z.string().url()).min(1),
  fields: z.array(plannedFieldSchema).max(12),
  /** The user's extraction guidance from the preview step, e.g. "the author is in the byline". */
  steer: z.string().max(2000).optional(),
});

export type PlannedType = z.infer<typeof plannedTypeSchema>;

export const importPlanSchema = z.object({
  origin: z.string().url(),
  types: z.array(plannedTypeSchema).min(1).max(10),
});

export type ImportPlan = z.infer<typeof importPlanSchema>;

export const importProgressSchema = z.object({
  total: z.number(),
  imported: z.number(),
  failed: z.number(),
  /** Pages extraction judged not to be an entry of their type. */
  skipped: z.number().optional().default(0),
});

export type ImportProgress = z.infer<typeof importProgressSchema>;

export const importItemSchema = z.object({
  url: z.string(),
  /** The planned type's name, so the report reads in the model's words. */
  type: z.string(),
  status: z.enum(['imported', 'skipped', 'failed']),
  slug: z.string().optional(),
  error: z.string().optional(),
});

export type ImportItem = z.infer<typeof importItemSchema>;

export type ImportRunStatus = 'running' | 'completed' | 'failed';

/**
 * The entry slug a page's URL carries, e.g. /blog/hello-world -> hello-world.
 * Null for a root URL, where the title has to name the entry instead.
 */
export function entrySlugFromUrl(url: string): string | null {
  const path = new URL(url).pathname.replace(/\/+$/, '');
  const segment = path.split('/').filter(Boolean).pop();
  return segment ?? null;
}
