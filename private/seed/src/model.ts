import type { FieldConfig, FieldType, SelectOption } from '@repo/content/schema';
import { seedContent } from '@repo/db/seed-data';

// The content model of the demo workspace: a Posts collection with the fields
// a blog actually carries, and a Landing map. Keys are what `@repo/content`'s
// slugify would have derived from each name, so a field renamed in the app
// keeps behaving as if the seed had created it there.

export type SeedField = {
  id: string;
  key: string;
  name: string;
  type: FieldType;
  config?: FieldConfig;
};

const option = (id: string, name: string, color: SelectOption['color']): SelectOption => ({
  id,
  name,
  color,
});

/** The Topic options, by the key used to reference them from a post. */
export const topics = {
  engineering: option('seed-topic-engineering', 'Engineering', 'blue'),
  design: option('seed-topic-design', 'Design', 'purple'),
  process: option('seed-topic-process', 'Process', 'green'),
  writing: option('seed-topic-writing', 'Writing', 'orange'),
};

/** The Tags options, by the key used to reference them from a post. */
export const tags = {
  craft: option('seed-tag-craft', 'Craft', 'gray'),
  onboarding: option('seed-tag-onboarding', 'Onboarding', 'blue'),
  performance: option('seed-tag-performance', 'Performance', 'green'),
  testing: option('seed-tag-testing', 'Testing', 'yellow'),
  measurement: option('seed-tag-measurement', 'Measurement', 'purple'),
  releases: option('seed-tag-releases', 'Releases', 'red'),
};

export const postFields: SeedField[] = [
  { id: 'seed-field-summary', key: 'summary', name: 'Summary', type: 'text' },
  { id: 'seed-field-body', key: 'body', name: 'Body', type: 'rich_text' },
  { id: 'seed-field-author', key: 'author', name: 'Author', type: 'person' },
  { id: 'seed-field-cover', key: 'cover', name: 'Cover', type: 'asset' },
  {
    id: 'seed-field-topic',
    key: 'topic',
    name: 'Topic',
    type: 'select',
    config: { options: Object.values(topics) },
  },
  {
    id: 'seed-field-tags',
    key: 'tags',
    name: 'Tags',
    type: 'multi_select',
    config: { options: Object.values(tags) },
  },
  { id: 'seed-field-published', key: 'published', name: 'Published', type: 'date' },
  { id: 'seed-field-featured', key: 'featured', name: 'Featured', type: 'checkbox' },
  {
    id: 'seed-field-related',
    key: 'related',
    name: 'Related',
    type: 'multi_reference',
    // Posts reference posts, which is the only self-reference in the model and
    // the reason the collection has to exist before its fields are written.
    config: { typeId: seedContent.posts.id },
  },
];

export const landingFields: SeedField[] = [
  { id: 'seed-field-headline', key: 'headline', name: 'Headline', type: 'text' },
  { id: 'seed-field-pitch', key: 'pitch', name: 'Pitch', type: 'rich_text' },
];
