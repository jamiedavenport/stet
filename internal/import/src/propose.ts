import { generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';

import type { FetchedPage } from './page';
import { importableFieldTypes, plannedFieldSchema } from './plan';
import type { PlannedType } from './plan';

// The one place AI shapes the model: given sampled pages per URL group, the
// model proposes collections and maps with typed fields. The user reviews and
// edits the result before anything is created, so this drafts and never
// decides.

export type GroupSample = {
  id: string;
  pattern: string;
  urls: string[];
  /** The section's index page; a listing, never an entry. */
  hubUrl?: string;
  /** The user's annotation from the scope step, e.g. "this is the blog". */
  note?: string;
  samples: FetchedPage[];
};

const proposalSchema = z.object({
  types: z.array(
    z.object({
      /** A group id for collections; the single page URL for maps. */
      source: z.string(),
      kind: z.enum(['collection', 'map']),
      name: z.string(),
      fields: z.array(plannedFieldSchema),
    }),
  ),
  skipped: z.array(z.object({ source: z.string(), reason: z.string() })),
});

export type Proposal = {
  types: PlannedType[];
  skipped: { source: string; reason: string }[];
};

const system = `You design content models for Stet, a headless CMS. Given sampled pages from a website, propose the model its content should live in.

Stet's model has two kinds of type:
- A collection holds many entries sharing a shape (blog posts, case studies). Propose one per group of pages with a repeating template.
- A map is a single standalone entry (an about page, a pricing page). Propose one per one-off page worth importing.

Field types: ${importableFieldTypes.join(', ')}. Rules:
- Every entry already has a title; do not propose a title field.
- Prefer exactly one rich_text field named "Body" for the main prose of a page.
- Use date for publish dates, multi_select for tags or categories, select for a single category, link for canonical or external URLs, text for short strings like an author name.
- Only propose fields the sampled pages actually show. Never invent.
- Each field's hint says where on the page its value lives, to guide extraction later.
- Skip page groups that are not content (search pages, tag archives, pagination, legal boilerplate), with a reason.
- For a collection, source is the group id. For a map, source is the page URL, which must come from the samples or URL lists you were shown.
- A collection may only come from a section group (a /section/* pattern). The "Top-level pages" group is one-off pages: propose maps or skips from it, never a collection.
- A section's index page, when noted, is a listing of the section's entries. It is never a collection entry; propose it as a map only if it carries standalone content worth editing.`;

export async function proposeModel(
  model: LanguageModel,
  input: { origin: string; groups: GroupSample[] },
): Promise<Proposal> {
  const prompt = [
    `Site: ${input.origin}`,
    ...input.groups.map((group) =>
      [
        `## Group ${group.id} (${group.pattern}, ${group.urls.length} pages)`,
        group.hubUrl === undefined
          ? null
          : `Section index page (a listing, not an entry): ${group.hubUrl}`,
        group.note === undefined || group.note === '' ? null : `User note: ${group.note}`,
        `URLs: ${group.urls.slice(0, 10).join(', ')}${group.urls.length > 10 ? ', …' : ''}`,
        ...group.samples.map((sample) => `### Sample page ${sample.url}\n${sample.content}`),
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    ),
  ].join('\n\n');

  const result = await generateObject({ model, schema: proposalSchema, system, prompt });

  const bySource = new Map(input.groups.map((group) => [group.id, group]));
  const types: PlannedType[] = [];
  for (const proposed of result.object.types) {
    const group = bySource.get(proposed.source);
    const urls =
      proposed.kind === 'collection'
        ? group?.urls
        : urlInScope(input.groups, proposed.source)
          ? [proposed.source]
          : undefined;
    if (urls === undefined) {
      continue;
    }
    types.push({ kind: proposed.kind, name: proposed.name, urls, fields: proposed.fields });
  }
  return { types, skipped: result.object.skipped };
}

/** Maps may only import pages the discovery actually found. */
function urlInScope(groups: GroupSample[], url: string): boolean {
  return groups.some((group) => group.urls.includes(url) || group.hubUrl === url);
}
