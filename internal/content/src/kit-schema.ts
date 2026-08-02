import { z } from 'zod';

import { fieldTypeSchema, optionColors } from './schema';

const nameSchema = z.string().min(1).max(80);
const typeSlugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase URL slug');
const fieldKeySchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'Use a lowercase API key');

const optionSchema = z
  .object({
    name: nameSchema,
    color: z.enum(optionColors),
  })
  .strict();

const fieldSchema = z
  .object({
    name: nameSchema,
    key: fieldKeySchema,
    type: fieldTypeSchema,
    options: z.array(optionSchema).max(200).optional(),
    collection: typeSlugSchema.optional(),
  })
  .strict()
  .superRefine((field, context) => {
    const selects = field.type === 'select' || field.type === 'multi_select';
    const references = field.type === 'reference' || field.type === 'multi_reference';
    if (selects && field.options === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Select fields need options',
      });
    }
    if (!selects && field.options !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Only select fields can have options',
      });
    }
    if (references && field.collection === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['collection'],
        message: 'Reference fields need a collection',
      });
    }
    if (!references && field.collection !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['collection'],
        message: 'Only reference fields can name a collection',
      });
    }
  });

const contentTypeSchema = z
  .object({
    name: nameSchema,
    slug: typeSlugSchema,
    kind: z.enum(['collection', 'map']),
    fields: z.array(fieldSchema).max(100),
  })
  .strict()
  .superRefine((type, context) => {
    const seen = new Set<string>();
    for (const [index, field] of type.fields.entries()) {
      if (seen.has(field.key)) {
        context.addIssue({
          code: 'custom',
          path: ['fields', index, 'key'],
          message: `Duplicate field key: ${field.key}`,
        });
      }
      seen.add(field.key);
    }
  });

export const modelKitSchema = z
  .object({
    format: z.literal('stet-model-kit'),
    version: z.literal(1),
    name: z.string().min(1).max(120),
    types: z.array(contentTypeSchema).max(100),
  })
  .strict()
  .superRefine((kit, context) => {
    const types = new Map<string, 'collection' | 'map'>();
    for (const [index, type] of kit.types.entries()) {
      if (types.has(type.slug)) {
        context.addIssue({
          code: 'custom',
          path: ['types', index, 'slug'],
          message: `Duplicate content type slug: ${type.slug}`,
        });
      }
      types.set(type.slug, type.kind);
    }
    for (const [typeIndex, type] of kit.types.entries()) {
      for (const [fieldIndex, field] of type.fields.entries()) {
        if (field.collection === undefined) {
          continue;
        }
        const target = types.get(field.collection);
        if (target === undefined) {
          context.addIssue({
            code: 'custom',
            path: ['types', typeIndex, 'fields', fieldIndex, 'collection'],
            message: `Collection not found: ${field.collection}`,
          });
        } else if (target !== 'collection') {
          context.addIssue({
            code: 'custom',
            path: ['types', typeIndex, 'fields', fieldIndex, 'collection'],
            message: 'Reference fields must point to a collection',
          });
        }
      }
    }
  });

export type ModelKit = z.infer<typeof modelKitSchema>;
