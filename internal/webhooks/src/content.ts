import * as Sentry from '@sentry/cloudflare';

import type { ContentChange } from './events/content-changed';

export type { ContentChange, ContentChangeAction } from './events/content-changed';

// Cloudflare.Env is only populated by the app's generated types, so this
// module names the one binding it needs and casts once at the boundary.
type BatchNamespace = {
  idFromName(name: string): unknown;
  get(id: unknown): { record(organizationId: string, change: ContentChange): Promise<void> };
};

/**
 * Adds a content change to its organization's batch, which emits them as one
 * `content.changed` webhook per window (see ./batch).
 *
 * Best-effort by design: a webhook is never the reason an editor's save
 * fails, so a batch that cannot be reached is reported and dropped.
 */
export async function recordContentChange(
  organizationId: string,
  change: ContentChange,
): Promise<void> {
  const namespace = await contentChangeBatches();
  if (namespace === undefined) {
    return;
  }
  try {
    const batch = namespace.get(namespace.idFromName(organizationId));
    await batch.record(organizationId, change);
  } catch (error) {
    Sentry.captureException(error);
  }
}

// Imported lazily, and separately from ./client, because the content domain
// reaches this module from unit tests that run under plain Node, where
// `cloudflare:workers` does not resolve. No worker means nothing to batch
// into, which is also what a missing binding means.
async function contentChangeBatches(): Promise<BatchNamespace | undefined> {
  try {
    const { env } = await import('cloudflare:workers');
    return (env as unknown as { CONTENT_CHANGES?: BatchNamespace }).CONTENT_CHANGES;
  } catch {
    return undefined;
  }
}
