import { and, database, eq, inArray, schema } from '@repo/db';

export type OrgSubscription = typeof schema.subscription.$inferSelect;

/** The organization's subscription row (active or trialing), if any. */
export async function getSubscription(organizationId: string): Promise<OrgSubscription | null> {
  const db = await database();
  const subscription = await db.query.subscription.findFirst({
    where: and(
      eq(schema.subscription.referenceId, organizationId),
      inArray(schema.subscription.status, ['active', 'trialing']),
    ),
  });
  return subscription ?? null;
}
