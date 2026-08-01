import type { Actor } from '@repo/audit';
import { and, database, eq, schema } from '@repo/db';

import { slugify, uniqueSlug } from './slug';

type StoredField = {
  id: string;
  typeId: string;
  key: string;
  name: string;
};

/** Demotes the current key and creates, or restores, the new canonical key. */
export async function rekeyField(
  field: StoredField,
  name: string,
  note: string | undefined,
  actor: Actor,
): Promise<string> {
  const db = await database();
  const keys = await db.query.contentFieldKey.findMany({
    where: eq(schema.contentFieldKey.typeId, field.typeId),
  });
  const desired = slugify(name, '_');
  if (desired === field.key) {
    return field.key;
  }
  const restored = keys.find(
    (row) => row.fieldId === field.id && row.key === desired && row.status === 'deprecated',
  );
  let key = desired;
  if (restored === undefined) {
    key = uniqueSlug(desired, new Set(keys.map((row) => row.key)), '_');
  }
  const deprecatedAt = new Date();
  const demote = db
    .update(schema.contentFieldKey)
    .set({
      status: 'deprecated',
      kind: 'renamed',
      oldName: field.name,
      note: cleanNote(note),
      deprecatedAt,
      deprecatedBy: actor.userId,
    })
    .where(
      and(
        eq(schema.contentFieldKey.fieldId, field.id),
        eq(schema.contentFieldKey.status, 'canonical'),
      ),
    );
  const canonical =
    restored === undefined
      ? db.insert(schema.contentFieldKey).values({
          id: crypto.randomUUID(),
          fieldId: field.id,
          typeId: field.typeId,
          key,
          status: 'canonical',
          createdAt: deprecatedAt,
        })
      : db
          .update(schema.contentFieldKey)
          .set({
            status: 'canonical',
            kind: null,
            oldName: null,
            note: null,
            deprecatedAt: null,
            deprecatedBy: null,
          })
          .where(eq(schema.contentFieldKey.id, restored.id));
  await executeTogether(db, [demote, canonical]);
  return key;
}

export function cleanNote(note: string | undefined): string | null {
  const cleaned = note?.trim();
  if (cleaned === undefined || cleaned.length === 0) {
    return null;
  }
  return cleaned;
}

type ContentDatabase = Awaited<ReturnType<typeof database>>;

/** D1 batches atomically; the better-sqlite test driver executes in order. */
export async function executeTogether(
  db: ContentDatabase,
  statements: PromiseLike<unknown>[],
): Promise<void> {
  const batch = (db as ContentDatabase & { batch?: (items: unknown[]) => Promise<unknown> }).batch;
  if (batch !== undefined) {
    await batch.call(db, statements);
    return;
  }
  for (const statement of statements) {
    await statement;
  }
}
