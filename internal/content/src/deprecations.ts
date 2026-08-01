import { recordAudit } from '@repo/audit';
import type { Actor } from '@repo/audit';
import { and, count, database, desc, eq, inArray, or, schema } from '@repo/db';
import { updateDocument } from '@repo/realtime/document';
import { bodyFragment, entryPage } from '@repo/realtime/entry';
import { recordContentChange } from '@repo/webhooks/content';

import { requireContentType } from './access';
import { broadcastContentChange } from './broadcast';
import { fieldTypeSchema, parseValues, valuesText } from './schema';
import type { FieldType } from './schema';

export type FieldAction = {
  id: string;
  fieldId: string;
  key: string;
  name: string;
  kind: 'deleted' | 'renamed';
  note: string | null;
  type: FieldType;
  typeSlug: string;
  typeName: string;
  canonicalKey: string | null;
  createdAt: Date;
  createdBy: string | null;
  entriesWithValue: number | null;
};

export async function countFieldActions(organizationId: string): Promise<number> {
  const db = await database();
  const [row] = await db
    .select({ actions: count() })
    .from(schema.contentFieldKey)
    .innerJoin(schema.contentType, eq(schema.contentType.id, schema.contentFieldKey.typeId))
    .where(
      and(
        eq(schema.contentType.organizationId, organizationId),
        eq(schema.contentFieldKey.status, 'deprecated'),
      ),
    );
  return row?.actions ?? 0;
}

/** Every deprecated key awaiting downstream migration, newest first. */
export async function listFieldActions(organizationId: string): Promise<FieldAction[]> {
  const db = await database();
  const rows = await db
    .select({
      key: schema.contentFieldKey,
      field: schema.contentField,
      type: schema.contentType,
      by: schema.user.name,
    })
    .from(schema.contentFieldKey)
    .innerJoin(schema.contentField, eq(schema.contentField.id, schema.contentFieldKey.fieldId))
    .innerJoin(schema.contentType, eq(schema.contentType.id, schema.contentField.typeId))
    .leftJoin(schema.user, eq(schema.user.id, schema.contentFieldKey.deprecatedBy))
    .where(
      and(
        eq(schema.contentType.organizationId, organizationId),
        eq(schema.contentFieldKey.status, 'deprecated'),
      ),
    )
    .orderBy(desc(schema.contentFieldKey.deprecatedAt));
  const canonical = await canonicalKeys(rows.map((row) => row.field.id));
  const counts = await valueCounts(rows.map((row) => row.field));
  return rows.map(({ key, field, type, by }) => ({
    id: key.id,
    fieldId: field.id,
    key: key.key,
    name: key.oldName ?? field.name,
    kind: key.kind === 'renamed' ? 'renamed' : 'deleted',
    note: key.note,
    type: fieldTypeSchema.parse(field.type),
    typeSlug: type.slug,
    typeName: type.name,
    canonicalKey: canonical.get(field.id) ?? null,
    createdAt: key.deprecatedAt ?? new Date(0),
    createdBy: by,
    entriesWithValue: field.type === 'rich_text' ? null : (counts.get(field.id) ?? 0),
  }));
}

async function canonicalKeys(fieldIds: string[]): Promise<Map<string, string>> {
  if (fieldIds.length === 0) {
    return new Map();
  }
  const db = await database();
  const rows = await db.query.contentFieldKey.findMany({
    where: and(
      inArray(schema.contentFieldKey.fieldId, [...new Set(fieldIds)]),
      or(
        eq(schema.contentFieldKey.status, 'canonical'),
        eq(schema.contentFieldKey.kind, 'deleted'),
      ),
    ),
    columns: { fieldId: true, key: true },
  });
  return new Map(rows.map((row) => [row.fieldId, row.key]));
}

async function valueCounts(
  fields: (typeof schema.contentField.$inferSelect)[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const uniqueFields = [...new Map(fields.map((field) => [field.id, field])).values()];
  const typeIds = [...new Set(uniqueFields.map((field) => field.typeId))];
  if (typeIds.length === 0) {
    return counts;
  }
  const db = await database();
  const entries = await db.query.contentEntry.findMany({
    where: inArray(schema.contentEntry.typeId, typeIds),
    columns: { typeId: true, values: true },
  });
  for (const entry of entries) {
    const values = parseValues(entry.values);
    for (const field of uniqueFields) {
      if (field.typeId === entry.typeId && values[field.id] !== undefined) {
        counts.set(field.id, (counts.get(field.id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** Completes one Action. Repeating a completed action is a harmless no-op. */
export async function completeFieldAction(
  organizationId: string,
  id: string,
  actor: Actor,
): Promise<void> {
  const db = await database();
  const rows = await db
    .select({ key: schema.contentFieldKey, field: schema.contentField })
    .from(schema.contentFieldKey)
    .innerJoin(schema.contentField, eq(schema.contentField.id, schema.contentFieldKey.fieldId))
    .where(and(eq(schema.contentFieldKey.id, id), eq(schema.contentFieldKey.status, 'deprecated')))
    .limit(1);
  const row = rows[0];
  if (row === undefined) {
    return;
  }
  const type = await requireContentType(organizationId, row.field.typeId);
  if (row.key.kind === 'deleted') {
    await purgeDeletedField(organizationId, row.field);
  } else {
    await db.delete(schema.contentFieldKey).where(eq(schema.contentFieldKey.id, row.key.id));
  }
  await recordAudit({
    organizationId,
    actor,
    action: 'field.action.complete',
    subject: { type: 'field', id: row.field.id, label: row.key.oldName ?? row.field.name },
    details: { kind: row.key.kind ?? 'renamed', key: row.key.key, contentType: type.name },
  });
  await recordContentChange(organizationId, {
    subject: 'field',
    action: 'purged',
    id: row.field.id,
    type: type.slug,
    key: row.key.key,
    name: row.key.oldName ?? row.field.name,
  });
  await broadcastContentChange(organizationId, type);
}

async function purgeDeletedField(
  organizationId: string,
  field: typeof schema.contentField.$inferSelect,
): Promise<void> {
  const db = await database();
  const entries = await db.query.contentEntry.findMany({
    where: eq(schema.contentEntry.typeId, field.typeId),
    columns: { id: true, values: true },
  });
  for (const entry of entries) {
    const values = parseValues(entry.values);
    if (!(field.id in values)) {
      continue;
    }
    delete values[field.id];
    await db
      .update(schema.contentEntry)
      .set({ values: JSON.stringify(values), fieldText: valuesText(values) })
      .where(eq(schema.contentEntry.id, entry.id));
  }
  if (field.type === 'rich_text') {
    await purgeBodies(organizationId, field.id, entries);
  }
  await purgeRevisions(
    field.id,
    entries.map((entry) => entry.id),
  );
  await db.delete(schema.contentField).where(eq(schema.contentField.id, field.id));
}

async function purgeBodies(
  organizationId: string,
  fieldId: string,
  entries: { id: string }[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  const db = await database();
  const written = await db.query.document.findMany({
    where: and(
      eq(schema.document.organizationId, organizationId),
      inArray(
        schema.document.page,
        entries.map((entry) => entryPage(entry.id)),
      ),
    ),
    columns: { page: true },
  });
  const pages = new Set(written.map((row) => row.page));
  for (const entry of entries) {
    if (!pages.has(entryPage(entry.id))) {
      continue;
    }
    await updateDocument({ organizationId, page: entryPage(entry.id) }, (doc) => {
      const body = bodyFragment(doc, fieldId);
      body.delete(0, body.length);
    });
  }
}

async function purgeRevisions(fieldId: string, entryIds: string[]): Promise<void> {
  if (entryIds.length === 0) {
    return;
  }
  const db = await database();
  const revisions = await db.query.contentRevision.findMany({
    where: inArray(schema.contentRevision.entryId, entryIds),
  });
  for (const revision of revisions) {
    const values = parseValues(revision.values);
    const bodies = JSON.parse(revision.bodies) as Record<string, string>;
    if (!(fieldId in values) && !(fieldId in bodies)) {
      continue;
    }
    delete values[fieldId];
    delete bodies[fieldId];
    await db
      .update(schema.contentRevision)
      .set({ values: JSON.stringify(values), bodies: JSON.stringify(bodies) })
      .where(eq(schema.contentRevision.id, revision.id));
  }
}
