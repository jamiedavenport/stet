import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';

import type { FetchedPage } from './page';
import type { PlannedField, PlannedType } from './plan';

// One page in, one entry out. The schema is built from the planned fields so
// the model can only answer in the shape the user approved; the steer string
// is the user's correction channel from the preview step.

export type ExtractedEntry = {
  /** False when the page is not one entry of the expected type; skip it. */
  matches: boolean;
  title: string;
  /** Keyed by planned field name; select values are option names, not ids. */
  values: Record<string, string | number | boolean | string[] | null>;
  /** Markdown per rich_text field, keyed by planned field name. */
  bodies: Record<string, string>;
};

const system = `You extract content from a web page into a CMS entry. Rules:
- First decide matches: true only when this page is a single entry of the expected type. A listing or index page, a homepage, or an unrelated page is matches: false, with an empty title, null values, and empty bodies. Never force an entry out of the wrong page.
- Extract only what the page shows. A field the page does not show is null.
- Body fields are markdown: keep headings, lists, links, images (absolute URLs), bold and italic, code, blockquotes, and tables. Drop navigation, footers, sidebars, cookie banners, newsletter forms, share buttons, comments, and "related posts".
- Dates are ISO format, e.g. 2026-07-29.
- Select values are the label as written on the page.
- The title is the page's own heading, not the site name; strip any " | Site Name" suffix.`;

export async function extractEntry(
  model: LanguageModel,
  options: { page: FetchedPage; type: Pick<PlannedType, 'name' | 'fields' | 'steer'> },
): Promise<ExtractedEntry> {
  const fields = options.type.fields;
  const schema = z.object({
    matches: z
      .boolean()
      .describe('True only when this page is a single entry of the expected type.'),
    title: z.string(),
    values: z.object(valuesShape(fields)),
    bodies: z.object(bodiesShape(fields)),
  });

  const steer =
    options.type.steer === undefined || options.type.steer === ''
      ? ''
      : `\n\nGuidance from the user, which overrides the field hints:\n${options.type.steer}`;
  const prompt = `Extract one "${options.type.name}" entry from this page.${steer}\n\nPage URL: ${options.page.url}\n\n${options.page.content}`;

  const result = await generateObject({ model, schema, system, prompt });
  return result.object as ExtractedEntry;
}

function valuesShape(fields: PlannedField[]): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    if (field.type !== 'rich_text') {
      shape[field.name] = valueSchema(field).nullable().describe(field.hint);
    }
  }
  return shape;
}

function bodiesShape(fields: PlannedField[]): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    if (field.type === 'rich_text') {
      shape[field.name] = z.string().describe(`Markdown. ${field.hint}`);
    }
  }
  return shape;
}

function valueSchema(field: PlannedField): z.ZodType {
  switch (field.type) {
    case 'number':
      return z.number();
    case 'checkbox':
      return z.boolean();
    case 'multi_select':
      return z.array(z.string());
    case 'date':
      return z.string().describe('ISO date');
    default:
      return z.string();
  }
}
