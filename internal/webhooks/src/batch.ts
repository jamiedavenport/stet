import { createLogger } from '@repo/logging';
import { DurableObject } from 'cloudflare:workers';

import { addChange } from './changes';
import type { ChangeBatch } from './changes';
import { emitWebhookEvent } from './client';
import { contentChanged } from './events/content-changed';
import type { ContentChange } from './events/content-changed';

// What the batch needs from the worker environment. The real Env (apps/web)
// satisfies this structurally.
export type BatchEnv = {
  // Seconds content changes collect for before the webhook fires. Override in
  // .dev.vars to watch a rebuild trigger quickly.
  WEBHOOKS_BATCH_SECONDS?: string;
  // Read by the Sentry wrapper around this class, which initializes the SDK
  // per instance because a Durable Object runs outside the fetch handler.
  SENTRY_DSN: string;
};

const defaultWindowSeconds = 60;
const metaKey = 'meta';
const batchKey = 'batch';

type BatchMeta = {
  organizationId: string;
};

/**
 * One batch per organization, holding the content changes made since the
 * window opened and emitting them as a single `content.changed` webhook when
 * it closes. Rebuild hooks are why it exists: a deploy per keystroke is what
 * a receiver like Vercel gets without it.
 *
 * The alarm is armed only when nothing is pending, and never pushed back by a
 * new change, so a steady stream of edits still flushes once per window
 * rather than being deferred for as long as someone keeps typing.
 */
export class ContentChangeBatch extends DurableObject<BatchEnv> {
  async record(organizationId: string, change: ContentChange): Promise<void> {
    // The alarm emits with no caller in hand, so it needs to be told whose
    // changes these are.
    await this.ctx.storage.put<BatchMeta>(metaKey, { organizationId });

    const batch = await this.ctx.storage.get<ChangeBatch>(batchKey);
    await this.ctx.storage.put<ChangeBatch>(batchKey, addChange(batch, change, new Date()));

    // An alarm the runtime has given up retrying reads as absent here, so the
    // next change re-arms it and a window can never be stuck open.
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + this.windowMs());
    }
  }

  // Closes the window. Throwing lets the runtime retry with backoff, so a
  // queue hiccup keeps the batch rather than dropping a rebuild trigger.
  async alarm(): Promise<void> {
    const log = createLogger({ webhook: { eventType: contentChanged.type } });
    try {
      const batch = await this.ctx.storage.get<ChangeBatch>(batchKey);
      if (batch === undefined || batch.changes.length === 0) {
        return;
      }
      const meta = await this.ctx.storage.get<BatchMeta>(metaKey);
      if (meta === undefined) {
        await this.ctx.storage.delete(batchKey);
        return;
      }
      log.set({
        organization: { id: meta.organizationId },
        webhook: { changes: batch.changes.length },
      });

      await emitWebhookEvent({
        organizationId: meta.organizationId,
        type: contentChanged.type,
        payload: { changes: batch.changes, since: batch.since, truncated: batch.truncated },
      });
      await this.ctx.storage.delete(batchKey);
    } finally {
      log.emit();
    }
  }

  private windowMs(): number {
    const configured = Number(this.env.WEBHOOKS_BATCH_SECONDS);
    if (Number.isFinite(configured) && configured >= 1) {
      return configured * 1000;
    }
    return defaultWindowSeconds * 1000;
  }
}
