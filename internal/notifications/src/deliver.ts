import { and, database, eq, inArray, schema } from '@repo/db';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

import { notificationChannels } from './define';
import type { NotificationChannel, RenderedNotification } from './define';
import type { HubDeliverInput } from './hub';
import { notificationTypes, registry } from './registry';
import { expandRecipients, recipientSelectorSchema } from './selector';

// What travels on the queue for the deliver-notification job (@repo/jobs
// wraps this in a defineJob). The payload is re-parsed against the type's
// registry schema below, so an envelope from an older deploy cannot deliver
// a malformed notification.
export const deliverNotificationSchema = z.object({
  type: z.enum(notificationTypes),
  to: recipientSelectorSchema,
  payload: z.unknown(),
});

export type DeliverNotificationInput = z.output<typeof deliverNotificationSchema>;

// Cloudflare.Env is only populated by the app's generated types, so this
// package names the one binding it needs and casts once at the boundary.
type HubNamespace = {
  idFromName(name: string): unknown;
  get(id: unknown): { deliver(input: HubDeliverInput): Promise<void> };
};

// Eager fan-out: one notification row per recipient with the rendered
// snapshot denormalized in, which keeps feed reads and unread counts a
// single indexed query.
export async function deliverNotification(input: DeliverNotificationInput): Promise<void> {
  const db = await database();
  const definition = registry[input.type];
  const payload = definition.schema.parse(input.payload);
  // `schema` and `render` belong to the same definition, but indexing the
  // registry with a union of types loses that correlation and widens `render`
  // to demand the intersection of every payload. The parse above is what
  // actually guarantees the shape reaching it.
  const render = definition.render as (value: unknown) => RenderedNotification;

  const recipients = await expandRecipients(input.to);
  if (recipients.length === 0) {
    return;
  }

  const rendered = render(payload);

  const preferenceRows = await db.query.notificationPreference.findMany({
    where: and(
      eq(schema.notificationPreference.type, input.type),
      inArray(schema.notificationPreference.userId, recipients),
    ),
  });
  // The master email switch (one-click unsubscribe writes it) beats any
  // per-type preference, so an opted-out recipient's outbox never grows.
  const emailOff = new Set(
    (
      await db.query.notificationSettings.findMany({
        where: inArray(schema.notificationSettings.userId, recipients),
      })
    )
      .filter((row) => row.emailEnabled === false)
      .map((row) => row.userId),
  );

  const createdAt = new Date();
  const rows: (typeof schema.notification.$inferInsert)[] = [];
  const deliveries: HubDeliverInput[] = [];
  for (const userId of recipients) {
    const channels = resolveChannels(
      definition.defaultChannels,
      preferenceRows.filter((row) => row.userId === userId),
    );
    if (channels.length === 0) {
      continue;
    }
    if (channels.includes('app')) {
      rows.push({
        id: crypto.randomUUID(),
        userId,
        organizationId: input.to.organizationId,
        type: input.type,
        payload: JSON.stringify(payload),
        title: rendered.title,
        href: rendered.href,
        readAt: null,
        createdAt,
      });
    }
    deliveries.push({
      userId,
      organizationId: input.to.organizationId,
      nudge: channels.includes('app'),
      emailItem: channels.includes('email') && !emailOff.has(userId) ? rendered : null,
    });
  }

  // D1 caps bound parameters per statement, so large fan-outs insert in
  // chunks.
  for (let start = 0; start < rows.length; start += 10) {
    await db.insert(schema.notification).values(rows.slice(start, start + 10));
  }

  // Best-effort by design: a failed poke after the rows are inserted must
  // not throw, because a queue retry would rerun the whole handler and
  // duplicate every row. Open tabs fall back to refetching on navigation.
  const hubs = (env as { NOTIFICATION_HUB?: HubNamespace }).NOTIFICATION_HUB;
  if (hubs === undefined) {
    console.error('[notifications] NOTIFICATION_HUB binding missing, skipping hub delivery.');
    return;
  }
  for (const delivery of deliveries) {
    try {
      const hub = hubs.get(hubs.idFromName(`${delivery.organizationId}:${delivery.userId}`));
      await hub.deliver(delivery);
    } catch (error) {
      console.error(`[notifications] Hub delivery failed for user ${delivery.userId}:`, error);
    }
  }
}

// Preference rows are exceptions on top of the type's default channels: an
// enabled row opts in, a disabled row opts out, unknown channels are
// ignored.
function resolveChannels(
  defaults: readonly NotificationChannel[],
  rows: { channel: string; enabled: boolean }[],
): NotificationChannel[] {
  const channels = new Set<NotificationChannel>(defaults);
  for (const row of rows) {
    const channel = notificationChannels.find((known) => known === row.channel);
    if (channel === undefined) {
      continue;
    }
    if (row.enabled) {
      channels.add(channel);
    } else {
      channels.delete(channel);
    }
  }
  return [...channels];
}
