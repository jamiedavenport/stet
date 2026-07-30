import type { Actor } from '@repo/audit';
import * as entries from '@repo/content/entries';
import * as fields from '@repo/content/fields';
import * as model from '@repo/content/model';
import {
  fieldTypeSchema,
  fieldValueSchema,
  isReferenceType,
  nextOptionColor,
} from '@repo/content/schema';
import type { SelectOption } from '@repo/content/schema';
import { writeEntryBody } from '@repo/content/write-body';
import { and, asc, database, eq, schema } from '@repo/db';
import { tool } from 'ai';
import type { ToolSet } from 'ai';
import { z } from 'zod';

const fieldInput = z.object({
  name: z.string().min(1).max(80),
  type: fieldTypeSchema,
  options: z
    .array(z.string().min(1))
    .optional()
    .describe('Option names, for select and multi_select fields only'),
  collection: z
    .string()
    .optional()
    .describe('Slug of the collection to point at, for reference and multi_reference fields only'),
});

const valuesInput = z
  .record(z.string(), fieldValueSchema)
  .describe('Field values keyed by field key. Rich text bodies cannot be set here.');

async function typeBySlug(organizationId: string, slug: string) {
  const db = await database();
  return db.query.contentType.findFirst({
    where: and(
      eq(schema.contentType.organizationId, organizationId),
      eq(schema.contentType.slug, slug),
    ),
  });
}

async function createFieldWithOptions(
  organizationId: string,
  typeId: string,
  input: z.infer<typeof fieldInput>,
  actor: Actor,
): Promise<{ id: string; key: string } | { error: string }> {
  const options: SelectOption[] = [];
  for (const name of input.options ?? []) {
    options.push({ id: crypto.randomUUID(), name, color: nextOptionColor(options) });
  }
  let target: string | undefined;
  if (isReferenceType(input.type)) {
    if (input.collection === undefined) {
      return { error: `The "${input.name}" field needs a collection to point at.` };
    }
    const referenced = await typeBySlug(organizationId, input.collection);
    if (referenced === undefined || referenced.kind !== 'collection') {
      return { error: `No collection has the slug "${input.collection}".` };
    }
    target = referenced.id;
  }
  return fields.createField(
    organizationId,
    {
      typeId,
      name: input.name,
      type: input.type,
      config: { ...(options.length > 0 ? { options } : {}), ...(target ? { typeId: target } : {}) },
    },
    actor,
  );
}

/**
 * The field keys an entry of `typeId` may set. Rich text is excluded: bodies
 * live in the entry's collaborative document, not in `values`.
 */
async function writableKeys(typeId: string): Promise<string[]> {
  const db = await database();
  const rows = await db.query.contentField.findMany({
    where: eq(schema.contentField.typeId, typeId),
    orderBy: asc(schema.contentField.position),
  });
  return rows.filter((row) => row.type !== 'rich_text').map((row) => row.key);
}

function unknownKeys(values: Record<string, unknown>, valid: string[]): string[] {
  return Object.keys(values).filter((key) => !valid.includes(key));
}

/**
 * Mutating tools, org-scoped by the caller. Every one pauses for the user's
 * approval in the chat before it runs: content is live, so nothing changes
 * without a human saying so.
 */
export function contentWriteTools(organizationId: string, actor: Actor): ToolSet {
  return {
    createContentType: tool({
      description:
        'Create a collection or map, optionally with its fields in one go. ' +
        'Slugs and field keys are derived from the names.',
      inputSchema: z.object({
        name: z.string().min(1).max(80),
        kind: z.enum(['collection', 'map']),
        fields: z.array(fieldInput).optional(),
      }),
      needsApproval: true,
      execute: async ({ name, kind, fields: fieldInputs }) => {
        const created = await model.createContentType(organizationId, { name, kind }, actor);
        const createdFields = [];
        for (const input of fieldInputs ?? []) {
          createdFields.push(
            await createFieldWithOptions(organizationId, created.id, input, actor),
          );
        }
        return { ...created, fields: createdFields };
      },
    }),

    updateContentType: tool({
      description: 'Rename a collection or map, or change its slug.',
      inputSchema: z.object({
        type: z.string().describe('The current slug'),
        name: z.string().min(1).max(80).optional(),
        slug: z.string().min(1).max(80).optional(),
      }),
      needsApproval: true,
      execute: async ({ type: slug, ...input }) => {
        const type = await typeBySlug(organizationId, slug);
        if (type === undefined) {
          return { error: `No collection or map has the slug "${slug}".` };
        }
        return model.updateContentType(organizationId, { id: type.id, ...input }, actor);
      },
    }),

    deleteContentType: tool({
      description: 'Delete a collection or map and every entry in it. Irreversible.',
      inputSchema: z.object({ type: z.string().describe('The slug') }),
      needsApproval: true,
      execute: async ({ type: slug }) => {
        const type = await typeBySlug(organizationId, slug);
        if (type === undefined) {
          return { error: `No collection or map has the slug "${slug}".` };
        }
        await model.deleteContentType(organizationId, type.id, actor);
        return { deleted: type.name };
      },
    }),

    addField: tool({
      description: 'Add a field to a collection or map.',
      inputSchema: z.object({
        type: z.string().describe('The collection or map slug'),
        field: fieldInput,
      }),
      needsApproval: true,
      execute: async ({ type: slug, field }) => {
        const type = await typeBySlug(organizationId, slug);
        if (type === undefined) {
          return { error: `No collection or map has the slug "${slug}".` };
        }
        return createFieldWithOptions(organizationId, type.id, field, actor);
      },
    }),

    deleteField: tool({
      description: 'Delete a field from a collection or map. Entry values under it are dropped.',
      inputSchema: z.object({ fieldId: z.string().describe('From getContentModel') }),
      needsApproval: true,
      execute: async ({ fieldId }) => {
        await fields.deleteField(organizationId, fieldId, actor);
        return { deleted: fieldId };
      },
    }),

    createEntry: tool({
      description: 'Create an entry in a collection, with a title and optionally field values.',
      inputSchema: z.object({
        type: z.string().describe('The collection slug'),
        title: z.string().min(1).max(200),
        values: valuesInput.optional(),
      }),
      needsApproval: true,
      execute: async ({ type: slug, title, values }) => {
        const type = await typeBySlug(organizationId, slug);
        if (type === undefined) {
          return { error: `No collection has the slug "${slug}".` };
        }
        const valid = await writableKeys(type.id);
        const unknown = unknownKeys(values ?? {}, valid);
        if (unknown.length > 0) {
          return { error: `Unknown field keys: ${unknown.join(', ')}.`, validKeys: valid };
        }
        return entries.createEntry(organizationId, { typeId: type.id, title, values }, actor);
      },
    }),

    updateEntry: tool({
      description: "Change an entry's title, slug, or field values. Values merge key by key.",
      inputSchema: z.object({
        entryId: z.string(),
        title: z.string().min(1).max(200).optional(),
        slug: z.string().min(1).max(200).optional(),
        values: valuesInput.optional(),
      }),
      needsApproval: true,
      execute: async ({ entryId, ...input }) => {
        const db = await database();
        const entry = await db.query.contentEntry.findFirst({
          where: and(
            eq(schema.contentEntry.id, entryId),
            eq(schema.contentEntry.organizationId, organizationId),
          ),
        });
        if (entry === undefined) {
          return { error: 'No entry has that id.' };
        }
        const valid = await writableKeys(entry.typeId);
        const unknown = unknownKeys(input.values ?? {}, valid);
        if (unknown.length > 0) {
          return { error: `Unknown field keys: ${unknown.join(', ')}.`, validKeys: valid };
        }
        return entries.updateEntry(organizationId, { id: entryId, ...input }, actor);
      },
    }),

    deleteEntry: tool({
      description: 'Delete an entry and its rich text bodies. Irreversible.',
      inputSchema: z.object({ entryId: z.string() }),
      needsApproval: true,
      execute: async ({ entryId }) => {
        await entries.deleteEntry(organizationId, entryId, actor);
        return { deleted: entryId };
      },
    }),

    writeBody: tool({
      description:
        "Write an entry's rich text body from markdown. Anyone with the entry open sees the " +
        'change live. Replace overwrites the whole body; append adds to the end.',
      inputSchema: z.object({
        entryId: z.string(),
        fieldKey: z.string().describe('A rich_text field key of the entry’s type'),
        markdown: z.string().min(1),
        mode: z.enum(['replace', 'append']).default('replace'),
      }),
      needsApproval: true,
      execute: async ({ entryId, fieldKey, markdown, mode }) => {
        const db = await database();
        const entry = await db.query.contentEntry.findFirst({
          where: and(
            eq(schema.contentEntry.id, entryId),
            eq(schema.contentEntry.organizationId, organizationId),
          ),
        });
        if (entry === undefined) {
          return { error: 'No entry has that id.' };
        }
        const field = await db.query.contentField.findFirst({
          where: and(
            eq(schema.contentField.typeId, entry.typeId),
            eq(schema.contentField.key, fieldKey),
          ),
        });
        if (field === undefined || field.type !== 'rich_text') {
          const rows = await db.query.contentField.findMany({
            where: eq(schema.contentField.typeId, entry.typeId),
          });
          return {
            error: `"${fieldKey}" is not a rich_text field of this entry.`,
            richTextKeys: rows.filter((row) => row.type === 'rich_text').map((row) => row.key),
          };
        }
        try {
          await writeEntryBody({ organizationId, entryId, fieldKey, markdown, mode });
        } catch (error) {
          // Returned rather than thrown so the model sees what failed (the
          // stream would mask a thrown error) and can tell the user.
          return { error: `Writing the body failed: ${String(error)}` };
        }
        return { written: fieldKey, mode };
      },
    }),
  };
}
