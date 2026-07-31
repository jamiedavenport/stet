import { notifyContentChanged } from '@repo/realtime/document';

import { contentTypePage } from './rooms';

/**
 * Tells everyone with this collection or map open that it changed, so their
 * table reads it again. Every write comes through here, whichever surface
 * made it: a browser only ever sees the writes it made itself, so the room
 * is how a change from the public API, the assistant's tools, or another
 * editor reaches the page watching it.
 */
export async function broadcastContentChange(
  organizationId: string,
  type: { kind: string; slug: string },
): Promise<void> {
  await notifyContentChanged({ organizationId, page: contentTypePage(type) });
}
