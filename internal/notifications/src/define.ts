import type { z } from 'zod';

export const notificationChannels = ['app', 'email'] as const;

export type NotificationChannel = (typeof notificationChannels)[number];

// What a notification looks like everywhere it surfaces: the feed row
// snapshot, the WebSocket nudge, and a line in the digest email. `href` is an
// app-relative link (e.g. '/members') or null for purely informational items.
export type RenderedNotification = {
  title: string;
  href: string | null;
};

export type NotificationDefinition<
  TType extends string = string,
  TSchema extends z.ZodType = z.ZodType,
> = {
  type: TType;
  // Human-readable name shown in notification settings.
  label: string;
  schema: TSchema;
  // Channels used when the recipient has no preference row for this type.
  defaultChannels: readonly NotificationChannel[];
  // Pure render. Runs at delivery time (the row snapshot and the digest
  // item) and again at read time; the snapshot keeps historical rows
  // rendering after this type changes shape or leaves the registry.
  render: (payload: z.output<TSchema>) => RenderedNotification;
};

export function defineNotification<TType extends string, TSchema extends z.ZodType>(
  definition: NotificationDefinition<TType, TSchema>,
): NotificationDefinition<TType, TSchema> {
  return definition;
}
