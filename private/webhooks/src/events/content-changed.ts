import { z } from 'zod';

import { defineWebhookEvent } from '../define';

const actionSchema = z.enum(['created', 'updated', 'deleted']);

export type ContentChangeAction = z.output<typeof actionSchema>;

const entryChangeSchema = z.object({
  subject: z.literal('entry'),
  action: actionSchema,
  id: z.string(),
  /** Slug of the collection or map the entry belongs to. */
  type: z.string(),
  slug: z.string(),
  title: z.string(),
});

const typeChangeSchema = z.object({
  subject: z.literal('type'),
  action: actionSchema,
  id: z.string(),
  slug: z.string(),
  name: z.string(),
});

const fieldChangeSchema = z.object({
  subject: z.literal('field'),
  action: actionSchema,
  id: z.string(),
  /** Slug of the collection or map the field belongs to. */
  type: z.string(),
  key: z.string(),
  name: z.string(),
});

export const contentChangeSchema = z.discriminatedUnion('subject', [
  entryChangeSchema,
  typeChangeSchema,
  fieldChangeSchema,
]);

export type ContentChange = z.output<typeof contentChangeSchema>;

/**
 * Everything an organization changed in one batch window, so a receiver that
 * rebuilds a site is triggered once per burst of editing rather than once per
 * keystroke. See ../batch for the window and how a burst collapses.
 */
export const contentChanged = defineWebhookEvent({
  type: 'content.changed',
  schema: z.object({
    /** One record per subject, in the order each was first touched. */
    changes: z.array(contentChangeSchema),
    /** When the window opened; the delivery's timestamp is when it closed. */
    since: z.iso.datetime(),
    /** True when the window held more changes than one payload carries. */
    truncated: z.boolean(),
  }),
});
