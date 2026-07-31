import { database, eq, schema } from '@repo/db';
import { z } from 'zod';

// Who a notification goes to. Always scoped to one organization; `users`
// narrows to explicit ids (still gated by membership), `roles` narrows to
// member roles, and `except` removes ids after the fact. Call sites should
// always put the acting user in `except` so nobody is notified about their
// own action.
export const recipientSelectorSchema = z.object({
  organizationId: z.string(),
  users: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
  except: z.array(z.string()).optional(),
});

export type RecipientSelector = z.output<typeof recipientSelectorSchema>;

// Expanded in the delivery job, not at the call site: the selector is what
// travels on the queue, so membership is evaluated when the notification is
// delivered and a stale selector can never notify someone who already left.
export async function expandRecipients(selector: RecipientSelector): Promise<string[]> {
  const db = await database();
  const members = await db.query.member.findMany({
    where: eq(schema.member.organizationId, selector.organizationId),
  });

  const recipients = new Set<string>();
  for (const member of members) {
    if (selector.roles !== undefined && selector.roles.includes(member.role) === false) {
      continue;
    }
    if (selector.users !== undefined && selector.users.includes(member.userId) === false) {
      continue;
    }
    recipients.add(member.userId);
  }
  for (const excluded of selector.except ?? []) {
    recipients.delete(excluded);
  }
  return [...recipients];
}
