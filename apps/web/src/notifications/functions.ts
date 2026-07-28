import { and, database, desc, eq, isNull, schema } from '@repo/db';
import {
  notificationChannels,
  notificationTypes,
  renderNotificationTitle,
} from '@repo/notifications/registry';
import { queryOptions } from '@tanstack/react-query';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { authenticatedMiddleware, organizationMiddleware } from '#/session';

const feedLimit = 30;

// Latest feed page plus the unread count, scoped to the active organization.
// Cached per org in TanStack Query; the hub WebSocket invalidates it when a
// new notification lands (see use-notification-socket).
const getNotifications = createServerFn({ method: 'GET' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const db = await database();
    const organizationId = context.organizationId;
    const userId = context.session.user.id;
    const scope = and(
      eq(schema.notification.userId, userId),
      eq(schema.notification.organizationId, organizationId),
    );

    const rows = await db.query.notification.findMany({
      where: scope,
      orderBy: desc(schema.notification.createdAt),
      limit: feedLimit,
    });
    // Titles re-render from the current registry; the stored title is only
    // the fallback for rows whose type left the registry.
    const items = rows.map((row) => ({ ...row, title: renderNotificationTitle(row) }));
    const unread = await db.$count(
      schema.notification,
      and(scope, isNull(schema.notification.readAt)),
    );
    return { items, unread };
  });

type NotificationFeed = Awaited<ReturnType<typeof getNotifications>>;
export type NotificationItem = NotificationFeed['items'][number];

export const markNotificationRead = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    await db
      .update(schema.notification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.notification.id, data.id),
          eq(schema.notification.userId, context.session.user.id),
          isNull(schema.notification.readAt),
        ),
      );
  });

export const markAllNotificationsRead = createServerFn({ method: 'POST' })
  .middleware([organizationMiddleware])
  .handler(async ({ context }) => {
    const db = await database();
    await db
      .update(schema.notification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(schema.notification.userId, context.session.user.id),
          eq(schema.notification.organizationId, context.organizationId),
          isNull(schema.notification.readAt),
        ),
      );
  });

// Preference exception rows plus quiet-hour settings for the settings page.
// The client overlays the rows on each type's default channels from the
// registry.
const getNotificationPreferences = createServerFn({ method: 'GET' })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const db = await database();
    const userId = context.session.user.id;
    const preferences = await db.query.notificationPreference.findMany({
      where: eq(schema.notificationPreference.userId, userId),
    });
    const settings = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.userId, userId),
    });
    return { preferences, settings: settings ?? null };
  });

export const updateNotificationPreference = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(
    z.object({
      type: z.enum(notificationTypes),
      channel: z.enum(notificationChannels),
      enabled: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await database();
    await db
      .insert(schema.notificationPreference)
      .values({ userId: context.session.user.id, ...data })
      .onConflictDoUpdate({
        target: [
          schema.notificationPreference.userId,
          schema.notificationPreference.type,
          schema.notificationPreference.channel,
        ],
        set: { enabled: data.enabled },
      });
  });

// The email channel's master switch; one-click unsubscribe writes the same
// column, this is how it turns back on.
export const setEmailEnabled = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data, context }) => {
    const db = await database();
    await db
      .insert(schema.notificationSettings)
      .values({ userId: context.session.user.id, emailEnabled: data.enabled })
      .onConflictDoUpdate({
        target: schema.notificationSettings.userId,
        set: { emailEnabled: data.enabled },
      });
  });

const hourSchema = z.number().int().min(0).max(23).nullable();

export const updateQuietHours = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(
    z.object({
      quietHoursStart: hourSchema,
      quietHoursEnd: hourSchema,
      timezone: z.string().max(64).nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await database();
    await db
      .insert(schema.notificationSettings)
      .values({ userId: context.session.user.id, ...data })
      .onConflictDoUpdate({
        target: schema.notificationSettings.userId,
        set: data,
      });
  });

export const notificationsQuery = (organizationId: string) =>
  queryOptions({
    queryKey: ['notifications', organizationId],
    queryFn: () => getNotifications(),
    staleTime: 30_000,
  });

export const notificationPreferencesQuery = queryOptions({
  queryKey: ['notification-preferences'],
  queryFn: () => getNotificationPreferences(),
  staleTime: 30_000,
});
