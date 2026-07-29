import type { AnalyticsMetadata } from '@repo/api';
import type { IngestEvent } from '@repo/analytics';
import { and, database, eq, notInArray, schema } from '@repo/db';
import { env } from 'cloudflare:workers';

import { keyed, os } from '#/api/implementer';

/** The organization's own analytics store, one Durable Object per organization. */
function storeFor(organizationId: string) {
  return env.ANALYTICS.get(env.ANALYTICS.idFromName(organizationId));
}

function toIngestEvent(
  event: {
    name: string;
    props: Record<string, unknown>;
    timestamp: number;
    url?: string;
    referrer?: string;
  },
  metadata: AnalyticsMetadata,
  context: Record<string, unknown>,
): IngestEvent {
  return {
    name: event.name,
    timestamp: event.timestamp,
    url: event.url,
    referrer: event.referrer,
    visitor: metadata.visitor ?? null,
    country: metadata.country ?? null,
    region: metadata.region ?? null,
    city: metadata.city ?? null,
    device: metadata.device ?? null,
    browser: metadata.browser ?? null,
    os: metadata.os ?? null,
    props: event.props,
    context,
  };
}

// Metadata describes the reader and so belongs to the batch, not to any one
// event; it is stamped onto each row here so a query never has to join.
const ingest = os.analytics.ingest.use(keyed).handler(async ({ input, context }) => {
  const events = input.events.map((event) => toIngestEvent(event, input.metadata, input.context));
  const accepted = await storeFor(context.organizationId).ingest(events);
  return { accepted };
});

/**
 * The plan is a replacement, not a merge: an event deleted from the code is
 * gone from the dashboard's list on the next sync. Events already recorded
 * under that name keep their rows, so history survives a rename in code.
 */
const sync = os.analytics.sync.use(keyed).handler(async ({ input, context }) => {
  const db = await database();
  const organizationId = context.organizationId;
  const now = new Date();
  const names = input.events.map((event) => event.name);

  const scope = eq(schema.analyticsEvent.organizationId, organizationId);
  await db
    .delete(schema.analyticsEvent)
    .where(names.length === 0 ? scope : and(scope, notInArray(schema.analyticsEvent.name, names)));

  for (const event of input.events) {
    await db
      .insert(schema.analyticsEvent)
      .values({
        id: crypto.randomUUID(),
        organizationId,
        name: event.name,
        props: JSON.stringify(event.props),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.analyticsEvent.organizationId, schema.analyticsEvent.name],
        set: { props: JSON.stringify(event.props), updatedAt: now },
      });
  }

  return { synced: input.events.length };
});

export const analytics = { ingest, sync };

/** The events an organization has declared, for the dashboard's event picker. */
export async function declaredEvents(
  organizationId: string,
): Promise<{ name: string; props: string[] }[]> {
  const db = await database();
  const rows = await db.query.analyticsEvent.findMany({
    where: eq(schema.analyticsEvent.organizationId, organizationId),
  });
  return rows
    .map((row) => ({ name: row.name, props: JSON.parse(row.props) as string[] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
