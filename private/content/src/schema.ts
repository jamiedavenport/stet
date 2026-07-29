import type { ContentFieldType } from '@repo/api';
import { z } from 'zod';

/**
 * The field types a collection or map can carry. Rich text is the one the
 * table cannot edit inline: its value is a collaborative document opened in
 * the entry editor, not a cell. Pinned to the public API's enum so the two
 * cannot drift.
 */
export const fieldTypes = [
  'text',
  'rich_text',
  'number',
  'checkbox',
  'date',
  'select',
  'multi_select',
  'link',
  'person',
] as const satisfies readonly ContentFieldType[];

export type FieldType = (typeof fieldTypes)[number];

export const fieldTypeSchema = z.enum(fieldTypes);

export const fieldTypeLabels: Record<FieldType, string> = {
  text: 'Text',
  rich_text: 'Rich text',
  number: 'Number',
  checkbox: 'Checkbox',
  date: 'Date',
  select: 'Select',
  multi_select: 'Multi-select',
  link: 'Link',
  person: 'Person',
};

/** Colors a select option can carry, mapped to badge styles in the UI. */
export const optionColors = [
  'gray',
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'pink',
] as const;

export type OptionColor = (typeof optionColors)[number];

const selectOptionSchema = z.object({
  // Values store the option id, so renaming an option never touches entries.
  id: z.string(),
  name: z.string().min(1),
  color: z.enum(optionColors),
});

export type SelectOption = z.infer<typeof selectOptionSchema>;

export const fieldConfigSchema = z.object({
  options: z.array(selectOptionSchema).optional(),
});

export type FieldConfig = z.infer<typeof fieldConfigSchema>;

/**
 * A stored entry value. Which member of the union applies follows from the
 * field's type; null clears the field whatever its type.
 */
export const fieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
]);

export type FieldValue = z.infer<typeof fieldValueSchema>;

export type EntryValues = Record<string, FieldValue>;

export function parseConfig(config: string): FieldConfig {
  const parsed = fieldConfigSchema.safeParse(JSON.parse(config));
  return parsed.success ? parsed.data : {};
}

export function parseValues(values: string): EntryValues {
  const parsed = z.record(z.string(), fieldValueSchema).safeParse(JSON.parse(values));
  return parsed.success ? parsed.data : {};
}

export function nextOptionColor(existing: readonly SelectOption[]): OptionColor {
  return optionColors[existing.length % optionColors.length];
}

/**
 * The searchable text of an entry's values: every string the fields hold,
 * mirrored into `contentEntry.fieldText` on write for the FTS index. Ids in
 * select and person values come along; they only match searches for the id
 * itself, which is harmless.
 */
export function valuesText(values: EntryValues): string {
  const parts: string[] = [];
  for (const value of Object.values(values)) {
    if (typeof value === 'string') {
      parts.push(value);
    } else if (Array.isArray(value)) {
      parts.push(...value);
    }
  }
  return parts.join(' ');
}
