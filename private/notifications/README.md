# @repo/notifications

Typed in-app and email notifications on the platform's own primitives: the jobs queue, a Durable Object per user, and D1 as the source of truth.

- Define notification types in `src/notifications/` (Zod payload schema, default channels, a pure render to title + link) and register them in `src/registry.ts`; `notify()`, the delivery job, the settings UI, and preference filtering all pick them up from there.
- `notify({ type, to, payload })` from `./client` is server-only (like `enqueue` in `@repo/jobs`) and costs one queue send regardless of fan-out size.
- The `deliver-notification` job expands the recipient selector against current membership, applies per-user channel preferences, writes one feed row per recipient (rendered title/link denormalized so old rows survive registry changes), and pokes each recipient's `NotificationHub`.
- The hub holds hibernated WebSockets from the user's open tabs (the bell updates live through `/api/notifications`, authenticated in the worker) and batches the email channel: an outbox in DO storage, flushed by a single alarm as one digest per user after `NOTIFICATIONS_FLUSH_SECONDS` (wrangler var; override in `.dev.vars` to test quickly).
- Quiet hours from `/settings` defer email flushes to the end of the user's window; in-app delivery is never delayed.
- Ships `member-joined`, sent from the organization hooks in `@repo/auth` to everyone in the org except the joiner.

## Adding a type

```ts
// src/notifications/task-assigned.ts
export const taskAssigned = defineNotification({
  type: 'task-assigned',
  label: 'A task is assigned to you',
  schema: z.object({ taskTitle: z.string(), assignedBy: z.string() }),
  defaultChannels: ['app', 'email'],
  render: (payload) => ({
    title: `${payload.assignedBy} assigned you "${payload.taskTitle}"`,
    href: '/tasks',
  }),
});

// Any server-side call site (payload typed from the schema):
await notify({
  type: 'task-assigned',
  to: { organizationId, users: [assigneeId], except: [actorId] },
  payload: { taskTitle, assignedBy: actorName },
});
```

`to` always names the organization; add `users` and/or `roles` to narrow, `except` to drop ids (put the acting user there so nobody is notified about their own action). Membership is resolved when the job runs, not when `notify()` is called.

## Email channel

The email channel batches through the per-user hub: items queue in an outbox and flush as one digest after the batch window (`NOTIFICATIONS_FLUSH_SECONDS`), respecting quiet hours. `notification_settings.email_enabled` is the channel's master switch: `deliverNotification` skips queuing for opted-out users, the hub drops an already-queued outbox rather than send refused mail, and the digest's one-click unsubscribe link (see [@repo/mail](../mail)) flips the switch off. The settings page turns it back on. Per-type preference rows stay untouched underneath, so re-enabling restores the previous shape.
