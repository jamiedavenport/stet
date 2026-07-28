import { emitWebhookEvent } from '@repo/webhooks/client';
import type { EmitWebhookOptions } from '@repo/webhooks/client';
import type { WebhookEventType } from '@repo/webhooks/registry';

/**
 * Enqueues an outbound webhook for an auth event. Best-effort: a queue hiccup
 * must never fail the request that triggered the event.
 */
export async function emitWebhook<TType extends WebhookEventType>(
  options: EmitWebhookOptions<TType>,
): Promise<void> {
  try {
    await emitWebhookEvent(options);
  } catch (error) {
    console.error(
      `[auth] Failed to enqueue ${options.type} webhook for org ${options.organizationId}:`,
      error,
    );
  }
}
