import { database, schema } from '@repo/db';
import { verifyUnsubscribeToken } from '@repo/mail/unsubscribe';
import type { UnsubscribeSubject } from '@repo/mail/unsubscribe';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { terminateWorkflow } from '@repo/workflows/client';
import { Link, createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { useState } from 'react';
import { z } from 'zod';

import { PageShell } from '#/components/page-shell';

// Applies an unsubscribe. Anyone holding a validly signed token may call
// this without a session: mail clients fire the RFC 8058 one-click POST from
// infrastructure that has no cookies, and the token itself is the proof.
async function applyUnsubscribe(subject: UnsubscribeSubject): Promise<void> {
  if (subject.kind === 'notification-emails') {
    const db = await database();
    await db
      .insert(schema.notificationSettings)
      .values({ userId: subject.id, emailEnabled: false })
      .onConflictDoUpdate({
        target: schema.notificationSettings.userId,
        set: { emailEnabled: false },
      });
    return;
  }
  // Stops the remaining reminder steps for this invitation; the id is the
  // stable instance name sendInvitationEmail started the chain with.
  await terminateWorkflow('invitation-reminder', `invitation-reminder-${subject.id}`);
}

const unsubscribe = createServerFn({ method: 'POST' })
  .validator((data: unknown) => z.object({ token: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const subject = await verifyUnsubscribeToken(env.BETTER_AUTH_SECRET, data.token);
    if (subject === null) {
      return { applied: false };
    }
    await applyUnsubscribe(subject);
    return { applied: true };
  });

// Signature check only, so the landing page can show the invalid state
// immediately without applying anything on a GET.
const checkToken = createServerFn({ method: 'GET' })
  .validator((data: unknown) => z.object({ token: z.string().optional() }).parse(data))
  .handler(async ({ data }) => {
    if (data.token === undefined) {
      return { valid: false };
    }
    const subject = await verifyUnsubscribeToken(env.BETTER_AUTH_SECRET, data.token);
    return { valid: subject !== null };
  });

export const Route = createFileRoute('/mail/unsubscribe')({
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: ({ deps }) => checkToken({ data: { token: deps.token } }),
  server: {
    handlers: {
      // The RFC 8058 one-click endpoint: mail clients POST here with
      // List-Unsubscribe=One-Click and no cookies. Applied directly (no
      // confirmation page), as the spec requires.
      POST: async ({ request }) => {
        const token = new URL(request.url).searchParams.get('token') ?? '';
        const subject = await verifyUnsubscribeToken(env.BETTER_AUTH_SECRET, token);
        if (subject === null) {
          return new Response('Invalid unsubscribe token.', { status: 400 });
        }
        await applyUnsubscribe(subject);
        return new Response('Unsubscribed.', { status: 200 });
      },
    },
  },
  component: UnsubscribePage,
});

// The emailed link lands here (a GET). It confirms with a click instead of
// applying immediately, so link prefetchers and mail scanners cannot
// unsubscribe anyone by fetching the URL.
function UnsubscribePage() {
  const { token } = Route.useSearch();
  const { valid } = Route.useLoaderData();
  const [state, setState] = useState<'idle' | 'pending' | 'done' | 'failed'>('idle');

  const apply = async () => {
    if (token === undefined) {
      return;
    }
    setState('pending');
    const result = await unsubscribe({ data: { token } });
    setState(result.applied ? 'done' : 'failed');
  };

  const invalid = !valid || state === 'failed';

  return (
    <PageShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-balance">
            {state === 'done' ? "You're unsubscribed" : 'Unsubscribe from emails'}
          </CardTitle>
          <CardDescription className="text-pretty">
            {invalid
              ? 'This unsubscribe link is invalid.'
              : state === 'done'
                ? "You won't receive these emails anymore. You can turn them back on in your notification settings at any time."
                : 'Confirm to stop receiving these emails.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!invalid && state !== 'done' ? (
            <Button onClick={() => void apply()} disabled={state === 'pending'}>
              {state === 'pending' ? 'Working…' : 'Unsubscribe'}
            </Button>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/app/settings" className="text-foreground underline underline-offset-4">
              {'Manage notification settings'}
            </Link>
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
