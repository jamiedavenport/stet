import { authErrors } from '@repo/api';
import { getSubscription, toPlanName, usageReport } from '@repo/billing/server';
import { database, eq, schema } from '@repo/db';
import { loadDocument } from '@repo/realtime/document';
import { ORPCError } from '@orpc/server';

import { analytics } from '#/api/analytics';
import { content } from '#/api/content';
import { authenticated, os } from '#/api/implementer';
import { webhooks } from '#/api/webhooks';
import { countWords, getNotesFragment, notesPage, notesText } from '#/notes/doc';

const health = os.health.handler(() => {
  return { status: 'ok' as const };
});

const getOrg = os.org.current.use(authenticated).handler(async ({ context }) => {
  const db = await database();
  const organization = await db.query.organization.findFirst({
    where: eq(schema.organization.id, context.organizationId),
  });

  // A key whose organization no longer exists is as good as an invalid key.
  if (organization === undefined) {
    throw new ORPCError('UNAUTHORIZED', {
      message: authErrors.UNAUTHORIZED.message,
    });
  }

  // The database hands back Date objects; the wire types use ISO 8601 strings.
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logo: organization.logo ?? null,
    createdAt: organization.createdAt.toISOString(),
  };
});

const getOrgBilling = os.org.billing.use(authenticated).handler(async ({ context }) => {
  const subscription = await getSubscription(context.organizationId);

  return {
    plan: toPlanName(subscription?.plan),
    status: subscription?.status ?? null,
    seats: subscription?.seats ?? null,
    periodEnd: subscription?.periodEnd == null ? null : subscription.periodEnd.toISOString(),
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd === true,
    usage: await usageReport(context.organizationId, subscription),
  };
});

// Reads the room's last flush from D1 rather than joining it. An API key has
// no session and no socket, so this is only answerable because the document
// is persisted outside the Durable Object.
const getNote = os.org.note.use(authenticated).handler(async ({ context }) => {
  const saved = await loadDocument({ organizationId: context.organizationId, page: notesPage });
  if (saved === null) {
    return { text: null, words: 0, savedAt: null };
  }

  const text = notesText(getNotesFragment(saved.doc));
  return { text, words: countWords(text), savedAt: saved.updatedAt.toISOString() };
});

export const router = os.router({
  health,
  analytics,
  content,
  org: {
    current: getOrg,
    billing: getOrgBilling,
    note: getNote,
  },
  webhooks,
});
