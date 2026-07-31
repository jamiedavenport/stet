import { formatIssues, validateEvent } from '@stetcms/analytics';
import type { IngestBatch } from '@stetcms/analytics';

import { analytics } from './plan';

export type Identity = {
  userId?: string;
  organizationId?: string;
};

/**
 * Validates one Worker-side event against the tracking plan and wraps it in
 * the batch shape `/api/v1/events` accepts.
 *
 * Kept apart from ./server so it carries no `cloudflare:workers` import and
 * can be exercised under plain Node. Throws rather than returning a result: a
 * name or a prop that fails here is a call site that should not have compiled.
 */
export async function toIngestBatch(
  name: string,
  props: Record<string, unknown>,
  identity: Identity,
): Promise<IngestBatch> {
  const validated = await validateEvent(analytics.events, name, props);
  if (!validated.ok) {
    throw new Error(`Event "${name}" failed the tracking plan: ${formatIssues(validated.issues)}`);
  }

  const context: Record<string, unknown> = {};
  if (identity.userId !== undefined) {
    context.userId = identity.userId;
  }
  if (identity.organizationId !== undefined) {
    context.organizationId = identity.organizationId;
  }

  return {
    context,
    // Nothing here has a reader behind it, so there is no visitor digest, no
    // geo and no device: these count as events and never as visits.
    metadata: {},
    events: [{ name, props: validated.props, timestamp: Date.now() }],
  };
}
