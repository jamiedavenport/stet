import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { m } from '@repo/i18n/messages';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError } from '@repo/ui/components/field';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { PageShell } from '#/components/page-shell';
import { getInvitation } from '#/organization/functions';
import { clearSessionContext, requireSession } from '#/session';

export const Route = createFileRoute('/invite/$id')({
  // Invited users need an account first; requireSession bounces them through
  // sign-in (which links to sign-up) and returns here.
  beforeLoad: ({ context, location }) => {
    requireSession(context.session, location);
  },
  loader: ({ params }) => getInvitation({ data: params.id }),
  component: InvitePage,
});

function InvitePage() {
  const { id } = Route.useParams();
  const invitation = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const accept = async () => {
    setError(null);
    setAccepting(true);
    const { data, error: acceptError } = await authClient.organization.acceptInvitation({
      invitationId: id,
    });
    if (acceptError || !data) {
      setAccepting(false);
      setError(acceptError?.message ?? m.unable_to_accept_invitation());
      return;
    }
    await authClient.organization.setActive({ organizationId: data.invitation.organizationId });
    clearSessionContext(queryClient);
    await navigate({ to: '/app' });
  };

  return (
    <PageShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-balance">
            {invitation
              ? m.join_org({ organizationName: invitation.organizationName })
              : m.invitation_not_found()}
          </CardTitle>
          <CardDescription className="text-pretty">
            {invitation
              ? m.invited_you_to_join({
                  inviterEmail: invitation.inviterEmail,
                  organizationName: invitation.organizationName,
                })
              : m.this_invitation_is_invalid_expired_or()}
          </CardDescription>
        </CardHeader>
        {invitation ? (
          <CardContent className="flex flex-col gap-3">
            {error ? <FieldError>{error}</FieldError> : null}
            <Button onClick={() => void accept()} disabled={accepting}>
              {accepting ? m.joining() : m.accept_invitation()}
            </Button>
          </CardContent>
        ) : null}
      </Card>
    </PageShell>
  );
}
