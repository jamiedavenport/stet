import type { LanguageModel } from 'ai';

import type { Actor } from '@repo/audit';
import { createEntry, updateEntry } from '@repo/content/entries';
import { createField, updateField } from '@repo/content/fields';
import { createContentType } from '@repo/content/model';
import { nextOptionColor, parseConfig } from '@repo/content/schema';
import type { EntryValues, FieldValue } from '@repo/content/schema';
import { writeEntryBody } from '@repo/content/write-body';
import { and, database, eq, isNull, schema } from '@repo/db';

import { extractEntry } from './extract';
import { fetchPage } from './page';
import { entrySlugFromUrl } from './plan';
import type { ImportItem, ImportPlan, ImportableFieldType } from './plan';

// The executor the site-import workflow runs: turn the plan into real types
// and fields once, then import one page at a time. Pages are processed
// sequentially, which keeps entry slug uniquing and select option creation
// free of races.

export type CreatedField = {
  id: string;
  key: string;
  name: string;
  type: ImportableFieldType;
  hint: string;
};

export type CreatedType = {
  typeId: string;
  name: string;
  kind: 'collection' | 'map';
  urls: string[];
  steer?: string;
  fields: CreatedField[];
  /** The map's one entry, created with the type; null for collections. */
  mapEntryId: string | null;
};

export async function createModelFromPlan(
  organizationId: string,
  plan: ImportPlan,
  actor: Actor,
): Promise<CreatedType[]> {
  const created: CreatedType[] = [];
  for (const planned of plan.types) {
    const type = await createContentType(
      organizationId,
      { name: planned.name, kind: planned.kind },
      actor,
    );
    const fields: CreatedField[] = [];
    for (const field of planned.fields) {
      const result = await createField(
        organizationId,
        { typeId: type.id, name: field.name, type: field.type },
        actor,
      );
      fields.push({ ...result, name: field.name, type: field.type, hint: field.hint });
    }
    created.push({
      typeId: type.id,
      name: planned.name,
      kind: planned.kind,
      urls: planned.urls,
      steer: planned.steer,
      fields,
      mapEntryId: planned.kind === 'map' ? await mapEntryId(type.id) : null,
    });
  }
  return created;
}

async function mapEntryId(typeId: string): Promise<string> {
  const db = await database();
  const row = await db.query.contentEntry.findFirst({
    where: eq(schema.contentEntry.typeId, typeId),
  });
  if (row === undefined) {
    throw new Error('A map was created without its entry');
  }
  return row.id;
}

export async function importPage(
  model: LanguageModel,
  organizationId: string,
  type: CreatedType,
  url: string,
  actor: Actor,
): Promise<ImportItem> {
  try {
    const page = await fetchPage(url);
    const extracted = await extractEntry(model, { page, type });
    if (!extracted.matches) {
      // The escape hatch: a listing or unrelated page must be skipped, not
      // forced into an invented entry.
      return { url, type: type.name, status: 'skipped', error: `Not a ${type.name} entry` };
    }

    const values: EntryValues = {};
    for (const field of type.fields) {
      if (field.type === 'rich_text') {
        continue;
      }
      const raw = extracted.values[field.name] ?? null;
      if (raw === null) {
        continue;
      }
      values[field.key] = await resolveValue(organizationId, field, raw, actor);
    }

    const title = extracted.title.trim().slice(0, 200) || 'Untitled';
    let entryId: string;
    let slug: string;
    if (type.kind === 'map') {
      if (type.mapEntryId === null) {
        throw new Error('Map type has no entry');
      }
      entryId = type.mapEntryId;
      ({ slug } = await updateEntry(organizationId, { id: entryId, title, values }, actor));
    } else {
      const entry = await createEntry(organizationId, { typeId: type.typeId, title }, actor);
      entryId = entry.id;
      ({ slug } = await updateEntry(
        organizationId,
        { id: entryId, slug: entrySlugFromUrl(url) ?? undefined, values },
        actor,
      ));
    }

    for (const field of type.fields) {
      if (field.type !== 'rich_text') {
        continue;
      }
      const markdown = extracted.bodies[field.name];
      if (typeof markdown === 'string' && markdown.trim() !== '') {
        await writeEntryBody({ organizationId, entryId, fieldId: field.id, markdown });
      }
    }

    return { url, type: type.name, status: 'imported', slug };
  } catch (error) {
    return {
      url,
      type: type.name,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function resolveValue(
  organizationId: string,
  field: CreatedField,
  raw: string | number | boolean | string[],
  actor: Actor,
): Promise<FieldValue> {
  if (field.type === 'select' && typeof raw === 'string') {
    const [id] = await optionIds(organizationId, field.id, [raw], actor);
    return id;
  }
  if (field.type === 'multi_select' && Array.isArray(raw)) {
    return optionIds(organizationId, field.id, raw, actor);
  }
  if (field.type === 'date' && typeof raw === 'string') {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString().slice(0, 10);
  }
  return raw;
}

/**
 * Option ids for the given names, creating options that do not exist yet.
 * Re-reads the field each time; the sequential page loop makes that safe.
 */
async function optionIds(
  organizationId: string,
  fieldId: string,
  names: string[],
  actor: Actor,
): Promise<string[]> {
  const db = await database();
  const row = await db.query.contentField.findFirst({
    where: and(eq(schema.contentField.id, fieldId), isNull(schema.contentField.deletedAt)),
  });
  if (row === undefined) {
    throw new Error('A field was deleted while the import ran');
  }
  const options = [...(parseConfig(row.config).options ?? [])];
  const ids: string[] = [];
  let added = false;
  for (const name of names) {
    const existing = options.find((option) => option.name.toLowerCase() === name.toLowerCase());
    if (existing !== undefined) {
      ids.push(existing.id);
      continue;
    }
    const option = { id: crypto.randomUUID(), name, color: nextOptionColor(options) };
    options.push(option);
    ids.push(option.id);
    added = true;
  }
  if (added) {
    await updateField(organizationId, { id: fieldId, config: { options } }, actor);
  }
  return ids;
}
