import { recordAudit } from '@repo/audit';
import type { Actor } from '@repo/audit';
import { and, database, desc, eq, inArray, isNotNull, schema } from '@repo/db';
import { updateDocument } from '@repo/realtime/document';
import { bodyFragment, entryPage } from '@repo/realtime/entry';
import { recordContentChange } from '@repo/webhooks/content';

import { requireContentType } from './access';
import { broadcastContentChange } from './broadcast';
import { fieldTypeSchema, parseValues, valuesText } from './schema';
import type { FieldType } from './schema';

// Deleted fields and what becomes of them. Deleting a field tombstones it
// (see ./fields) and leaves every value it held in place, so the API keeps
// serving the last value a deprecated key had and a customer's pages carry
// on rendering. Purging is the other half: the deliberate, developer-made
// decision to take the key and its values away for good.
//
// Server-only, like ./fields: callers authenticate, resolve the organization,
// and say who is acting before reaching them.

export type DeprecatedField = {
  id: string;
  key: string;
  name: string;
  type: FieldType;
  /** The collection or map the field belonged to. */
  typeSlug: string;
  typeName: string;
  deletedAt: Date;
  /** Null when no signed-in user deleted it, or that account is gone. */
  deletedBy: string | null;
  /**
   * How many entries still hold a value under the key. Null for rich text,
   * whose bodies live in each entry's realtime document rather than a column
   * a query can count.
   */
  entriesWithValue: number | null;
};

/**
 * Every deleted field the organization still carries, newest deletion first.
 * This is the list the Danger Zone purges from: each row is a key the
 * generated client still deprecates and values entries still hold.
 */
export async function listDeprecatedFields(organizationId: string): Promise<DeprecatedField[]> {
  const db = await database();
  const rows = await db
    .select({
      field: schema.contentField,
      type: schema.contentType,
      deletedByName: schema.user.name,
    })
    .from(schema.contentField)
    .innerJoin(schema.contentType, eq(schema.contentType.id, schema.contentField.typeId))
    .leftJoin(schema.user, eq(schema.user.id, schema.contentField.deletedBy))
    .where(
      and(
        eq(schema.contentType.organizationId, organizationId),
        isNotNull(schema.contentField.deletedAt),
      ),
    )
    .orderBy(desc(schema.contentField.deletedAt));

  const counts = await valueCounts(rows.map((row) => row.field));
  return rows.map(({ field, type, deletedByName }) => ({
    id: field.id,
    key: field.key,
    name: field.name,
    type: fieldTypeSchema.parse(field.type),
    typeSlug: type.slug,
    typeName: type.name,
    // Non-null by the query's own filter, which the row type cannot say.
    deletedAt: field.deletedAt ?? new Date(0),
    deletedBy: deletedByName,
    entriesWithValue: field.type === 'rich_text' ? null : (counts.get(field.id) ?? 0),
  }));
}

/** How many entries hold a value for each tombstoned field, by field id. */
async function valueCounts(
  fields: (typeof schema.contentField.$inferSelect)[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const typeIds = [...new Set(fields.map((field) => field.typeId))];
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
    for (const field of fields) {
      if (field.typeId === entry.typeId && values[field.key] !== undefined) {
        counts.set(field.id, (counts.get(field.id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

async function requireDeprecatedField(organizationId: string, id: string) {
  const db = await database();
  const field = await db.query.contentField.findFirst({
    where: and(eq(schema.contentField.id, id), isNotNull(schema.contentField.deletedAt)),
  });
  if (field === undefined) {
    throw new Error('Deleted field not found');
  }
  await requireContentType(organizationId, field.typeId);
  return field;
}

/**
 * Removes a deleted field and everything written under its key: entry values,
 * rich text bodies, and the copies every revision holds. The tombstone goes
 * with them, so the key leaves `/api/v1/model` and the next generated client
 * drops it rather than deprecating it.
 *
 * This is the one content change that can break a customer's build, which is
 * why nothing does it on the model's behalf: a developer asks for it from the
 * Danger Zone, having read what still depends on the key.
 */
export async function purgeField(organizationId: string, id: string, actor: Actor): Promise<void> {
  const db = await database();
  const field = await requireDeprecatedField(organizationId, id);
  const type = await requireContentType(organizationId, field.typeId);
  const entries = await db.query.contentEntry.findMany({
    where: eq(schema.contentEntry.typeId, field.typeId),
    columns: { id: true, values: true },
  });

  for (const entry of entries) {
    const values = parseValues(entry.values);
    if (!(field.key in values)) {
      continue;
    }
    delete values[field.key];
    // `updatedAt` is deliberately left alone: this removes a key editors
    // stopped seeing when it was deleted, so it is not an edit to the entry.
    await db
      .update(schema.contentEntry)
      .set({ values: JSON.stringify(values), fieldText: valuesText(values) })
      .where(eq(schema.contentEntry.id, entry.id));
  }

  if (field.type === 'rich_text') {
    await purgeBodies(organizationId, field.key, entries);
  }
  await purgeRevisions(
    field.key,
    entries.map((entry) => entry.id),
  );

  await db.delete(schema.contentField).where(eq(schema.contentField.id, field.id));
  await recordAudit({
    organizationId,
    actor,
    action: 'field.purge',
    subject: { type: 'field', id: field.id, label: field.name },
    details: { fieldType: field.type, contentType: type.name, key: field.key },
  });
  await recordContentChange(organizationId, {
    subject: 'field',
    action: 'purged',
    id: field.id,
    type: type.slug,
    key: field.key,
    name: field.name,
  });
  await broadcastContentChange(organizationId, type);
}

/** Empties the field's body in every entry whose document has one. */
async function purgeBodies(
  organizationId: string,
  fieldKey: string,
  entries: { id: string }[],
): Promise<void> {
  if (entries.length === 0) {
    return;
  }
  const db = await database();
  // Only a flushed document can hold a body, so the rest need no room woken
  // to find out they have nothing to clear.
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
      const body = bodyFragment(doc, fieldKey);
      body.delete(0, body.length);
    });
  }
}

/**
 * Strips the key from the history too. A revision holds a whole snapshot, so
 * leaving it there would keep the value one restore away from coming back
 * under a key the model no longer has.
 */
async function purgeRevisions(fieldKey: string, entryIds: string[]): Promise<void> {
  if (entryIds.length === 0) {
    return;
  }
  const db = await database();
  const revisions = await db.query.contentRevision.findMany({
    where: inArray(schema.contentRevision.entryId, entryIds),
    columns: { id: true, values: true, bodies: true },
  });
  for (const revision of revisions) {
    const values = parseValues(revision.values);
    const bodies = JSON.parse(revision.bodies) as Record<string, string>;
    if (!(fieldKey in values) && !(fieldKey in bodies)) {
      continue;
    }
    delete values[fieldKey];
    delete bodies[fieldKey];
    await db
      .update(schema.contentRevision)
      .set({ values: JSON.stringify(values), bodies: JSON.stringify(bodies) })
      .where(eq(schema.contentRevision.id, revision.id));
  }
}
