import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError } from '@repo/ui/components/field';
import { useNavigate, useRouter } from '@tanstack/react-router';

import { useAppRoute } from '#/use-app-route';
import { fullOrganizationQuery } from '#/organization/functions';
import { clearSessionContext } from '#/session';

// Leave the organization (any member) or delete it entirely (owners only).
// Both are confirmed inline before the destructive call runs.
export function OrgDanger() @{
  const { activeOrganization, user } = useAppRoute();
  const { data: org } = useSuspenseQuery(fullOrganizationQuery(activeOrganization.id));
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<'leave' | 'delete' | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const membership = org.members.find((member) => member.userId === user.id);
  const isOwner = membership?.role === 'owner';

  const afterChange = async () => {
    clearSessionContext(queryClient);
    await router.invalidate();
    await navigate({ to: '/app' });
  };

  const leave = async () => {
    setPending(true);
    setError(null);
    const { error: leaveError } = await authClient.organization.leave({
      organizationId: activeOrganization.id,
    });
    setPending(false);
    if (leaveError) {
      setError(leaveError.message ?? "Something went wrong. Try again.");
      return;
    }
    await afterChange();
  };

  const remove = async () => {
    setPending(true);
    setError(null);
    const { error: deleteError } = await authClient.organization.delete({
      organizationId: activeOrganization.id,
    });
    setPending(false);
    if (deleteError) {
      setError(deleteError.message ?? "Something went wrong. Try again.");
      return;
    }
    await afterChange();
  };

  <Card className="border-destructive/40">
    <CardHeader>
      <CardTitle className="text-destructive">{"Danger zone"}</CardTitle>
      <CardDescription>{"Leave or delete this organization."}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{"Leave this organization."}</p>
        @if (confirming === 'leave') {
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => void leave()}
            >
              {pending ? "Working…" : "Yes, leave"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(null)}>
              {"Cancel"}
            </Button>
          </div>
        } @else {
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              setConfirming('leave');
            }}
          >
            {"Leave"}
          </Button>
        }
      </div>
      @if (isOwner) {
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{"Permanently delete this organization and its data."}</p>
          @if (confirming === 'delete') {
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => void remove()}
              >
                {pending ? "Working…" : "Yes, delete"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                {"Cancel"}
              </Button>
            </div>
          } @else {
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setError(null);
                setConfirming('delete');
              }}
            >
              {"Delete organization"}
            </Button>
          }
        </div>
      }
      @if (error) {
        <FieldError>{error}</FieldError>
      }
    </CardContent>
  </Card>
}
