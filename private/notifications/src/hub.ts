import type { D1Database } from '@cloudflare/workers-types';
import { database, eq, schema } from '@repo/db';
import { createMailer } from '@repo/mail';
import { unsubscribeUrl } from '@repo/mail/unsubscribe';
import { DurableObject } from 'cloudflare:workers';

import type { RenderedNotification } from './define';

// What the hub needs from the worker environment. The real Env (apps/web)
// satisfies this structurally.
export type HubEnv = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  MAIL_FROM: string;
  BETTER_AUTH_URL: string;
  // Signs the one-click unsubscribe token in the digest email.
  BETTER_AUTH_SECRET: string;
  // Seconds an email waits in the outbox so a burst collapses into one
  // digest. Override in .dev.vars to test flushes quickly.
  NOTIFICATIONS_FLUSH_SECONDS?: string;
  // Read by the Sentry wrapper around this class, which initializes the SDK
  // per instance because a Durable Object runs outside the fetch handler.
  SENTRY_DSN: string;
};

export type HubDeliverInput = {
  userId: string;
  organizationId: string;
  // True when in-app rows were written, so open tabs should refetch.
  nudge: boolean;
  // Line to append to the email outbox, or null if the recipient has the
  // email channel off for this type.
  emailItem: RenderedNotification | null;
};

type HubMeta = {
  userId: string;
  organizationId: string;
};

const defaultFlushSeconds = 300;
const metaKey = 'meta';
const outboxKey = 'outbox';

// One hub per `${organizationId}:${userId}` (see apps/web/src/server.ts for
// the authenticated WebSocket route and the naming). Open tabs hold
// hibernated WebSockets here; the delivery job calls deliver() over RPC. The
// outbox plus the single storage alarm is what batches external delivery:
// the alarm is only ever moved forward by quiet hours, never by new items,
// so a steady stream of events still flushes every batch window.
export class NotificationHub extends DurableObject<HubEnv> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade.', { status: 426 });
    }

    // The worker routes here after authenticating, and stamps who this hub
    // belongs to; the alarm needs it to address the digest email.
    const userId = request.headers.get('x-user-id');
    const organizationId = request.headers.get('x-organization-id');
    if (userId === null || organizationId === null) {
      return new Response('Missing hub identity.', { status: 400 });
    }
    await this.ctx.storage.put<HubMeta>(metaKey, { userId, organizationId });

    const pair = new WebSocketPair();
    // Hibernation API: the DO can be evicted while sockets stay connected,
    // so idle hubs cost nothing.
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async deliver(input: HubDeliverInput): Promise<void> {
    await this.ctx.storage.put<HubMeta>(metaKey, {
      userId: input.userId,
      organizationId: input.organizationId,
    });

    if (input.nudge) {
      for (const socket of this.ctx.getWebSockets()) {
        try {
          socket.send('refresh');
        } catch {
          // A socket mid-close is not this delivery's problem.
        }
      }
    }

    if (input.emailItem !== null) {
      const outbox = (await this.ctx.storage.get<RenderedNotification[]>(outboxKey)) ?? [];
      outbox.push(input.emailItem);
      await this.ctx.storage.put(outboxKey, outbox);

      const existingAlarm = await this.ctx.storage.getAlarm();
      if (existingAlarm === null) {
        await this.ctx.storage.setAlarm(Date.now() + this.flushDelayMs());
      }
    }
  }

  // Flushes the outbox as one digest email. Throwing lets the runtime retry
  // the alarm with backoff, so a transient mail failure keeps the outbox.
  async alarm(): Promise<void> {
    const outbox = (await this.ctx.storage.get<RenderedNotification[]>(outboxKey)) ?? [];
    if (outbox.length === 0) {
      return;
    }

    const meta = await this.ctx.storage.get<HubMeta>(metaKey);
    if (meta === undefined) {
      console.error('[notifications] Hub has an outbox but no meta, dropping it.');
      await this.ctx.storage.delete(outboxKey);
      return;
    }

    const db = await database();
    const settings = await db.query.notificationSettings.findFirst({
      where: eq(schema.notificationSettings.userId, meta.userId),
    });
    // The switch may have flipped while items sat in the outbox; drop them
    // rather than send mail the user has already refused.
    if (settings?.emailEnabled === false) {
      await this.ctx.storage.delete(outboxKey);
      return;
    }
    const now = new Date();
    if (isInQuietHours(settings, now)) {
      // Re-check at the top of the next hour; quiet hours have hour
      // granularity, so that is the earliest the answer can change.
      const next = new Date(now);
      next.setMinutes(60, 0, 0);
      await this.ctx.storage.setAlarm(next.getTime());
      return;
    }

    const user = await db.query.user.findFirst({ where: eq(schema.user.id, meta.userId) });
    if (user === undefined) {
      await this.ctx.storage.delete(outboxKey);
      return;
    }
    const organization = await db.query.organization.findFirst({
      where: eq(schema.organization.id, meta.organizationId),
    });

    const mailer = createMailer({ apiKey: this.env.RESEND_API_KEY, from: this.env.MAIL_FROM });
    await mailer.sendNotificationDigest({
      to: user.email,
      organizationName: organization?.name ?? null,
      items: outbox,
      appLink: this.env.BETTER_AUTH_URL,
      unsubscribeUrl: await unsubscribeUrl(this.env.BETTER_AUTH_URL, this.env.BETTER_AUTH_SECRET, {
        kind: 'notification-emails',
        id: meta.userId,
      }),
    });
    await this.ctx.storage.delete(outboxKey);
  }

  private flushDelayMs(): number {
    const configured = Number(this.env.NOTIFICATIONS_FLUSH_SECONDS);
    if (Number.isFinite(configured) && configured >= 1) {
      return configured * 1000;
    }
    return defaultFlushSeconds * 1000;
  }
}

type QuietHoursSettings = {
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  timezone: string | null;
};

// Local-hour window check; a window may wrap midnight (e.g. 22 to 7). An
// unknown timezone fails open: better an email at night than never.
function isInQuietHours(settings: QuietHoursSettings | undefined, now: Date): boolean {
  if (settings === undefined) {
    return false;
  }
  const { quietHoursStart, quietHoursEnd } = settings;
  if (quietHoursStart === null || quietHoursEnd === null || quietHoursStart === quietHoursEnd) {
    return false;
  }

  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: settings.timezone ?? 'UTC',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(now),
    );
  } catch {
    return false;
  }

  if (quietHoursStart < quietHoursEnd) {
    return hour >= quietHoursStart && hour < quietHoursEnd;
  }
  return hour >= quietHoursStart || hour < quietHoursEnd;
}
