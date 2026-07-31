import type { z } from 'zod';

import type { NotificationDefinition, RenderedNotification } from './define';
import { memberJoined } from './notifications/member-joined';
import { mentionedInNotes } from './notifications/mentioned-in-notes';

export { notificationChannels, type NotificationChannel } from './define';

// Every notification type the app can send. Adding one means creating a
// definition in src/notifications/ and listing it here; notify(), the
// delivery job, and the settings UI all pick it up with full payload typing.
export const registry = {
  [memberJoined.type]: memberJoined,
  [mentionedInNotes.type]: mentionedInNotes,
} as const;

export type Registry = typeof registry;
export type NotificationType = keyof Registry;
export type NotificationPayload<TType extends NotificationType> = z.output<
  Registry[TType]['schema']
>;

// Non-empty tuple for z.enum in the delivery job schema.
export const notificationTypes = Object.keys(registry) as [NotificationType, ...NotificationType[]];

/**
 * Re-renders a stored feed row's title from the current registry, falling
 * back to the stored snapshot for types that left the registry or payloads
 * that no longer parse.
 */
export function renderNotificationTitle(row: {
  type: string;
  payload: string;
  title: string;
}): string {
  const definition = (registry as Record<string, NotificationDefinition>)[row.type];
  if (definition === undefined) {
    return row.title;
  }
  try {
    const payload = definition.schema.parse(JSON.parse(row.payload));
    const render = definition.render as (value: unknown) => RenderedNotification;
    return render(payload).title;
  } catch {
    return row.title;
  }
}
