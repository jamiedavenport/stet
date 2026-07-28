import { useState } from 'react';
import type { OrganizationRole } from '@repo/auth/access';
import { authClient } from '@repo/auth/client';
import { m } from '@repo/i18n/messages';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Separator } from '@repo/ui/components/separator';
import { z } from 'zod';

import { useAppRoute } from '#/use-app-route';
import { useAppForm } from '#/form';
import { type FullOrganization, fullOrganizationQuery } from '#/organization/functions';
import { MemberRoleSelect } from '#/organization/member-role-select.tsrx';
import { canChangeRole, roleLabel } from '#/organization/roles';

export function OrgMembers() @{
  const { activeOrganization, user, memberRole } = useAppRoute();
  const { data: org } = useSuspenseQuery(fullOrganizationQuery(activeOrganization.id));
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('member');

  const canManage = memberRole === 'owner' || memberRole === 'admin';
  const viewer = { userId: user.id, role: memberRole };

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: fullOrganizationQuery(activeOrganization.id).queryKey,
    });

  // Built in-render so m.*() resolves in the request's locale scope.
  const inviteSchema = z.object({
    email: z.email(m.enter_a_valid_email_address()),
  });

  const form = useAppForm({
    defaultValues: { email: '' },
    validators: { onSubmit: inviteSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.organization.inviteMember({
        email: value.email,
        role: inviteRole,
      });
      if (error) {
        setFormError(error.message ?? m.unable_to_send_invitation());
        return;
      }
      form.reset();
      await refresh();
    },
  });

  const removeMember = async (memberId: string) => {
    setRemoving(memberId);
    setMemberError(null);
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
      organizationId: activeOrganization.id,
    });
    setRemoving(null);
    if (error) {
      setMemberError(error.message ?? m.something_went_wrong_try_again());
      return;
    }
    await refresh();
  };

  const pending = org.invitations.filter((invitation) => invitation.status === 'pending');

  <Card>
    <CardHeader>
      <CardTitle>{m.members()}</CardTitle>
      <CardDescription>{m.people_with_access_to({ organizationName: org.name })}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      @if (canManage) {
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label={m.invite_email()}
                  type="email"
                  placeholder="teammate@example.com"
                />
              )}
            </form.AppField>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{m.role()}</span>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as OrganizationRole)}
              >
                <SelectTrigger className="h-8 w-28 text-xs capitalize" aria-label={m.role()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPositioner>
                  <SelectContent>
                    <SelectItem value="member" className="capitalize">
                      {m.member()}
                    </SelectItem>
                    <SelectItem value="admin" className="capitalize">
                      {m.admin()}
                    </SelectItem>
                  </SelectContent>
                </SelectPositioner>
              </Select>
            </div>
            @if (formError) {
              <FieldError>{formError}</FieldError>
            }
            <form.AppForm>
              <form.SubmitButton label={m.invite()} pendingLabel={m.inviting()} />
            </form.AppForm>
          </FieldGroup>
        </form>
      }
      <ul className="flex flex-col gap-2">
        @for (const member of org.members; key member.id) {
          <li className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              {member.user.name} <span className="text-muted-foreground">{member.user.email}</span>
            </span>
            <span className="flex items-center gap-2">
              @if (canChangeRole(viewer, member)) {
                <MemberRoleSelect
                  member={member}
                  viewerRole={memberRole}
                  organizationId={activeOrganization.id}
                  onChanged={refresh}
                  onError={setMemberError}
                />
              } @else {
                <span className="text-xs text-muted-foreground capitalize">
                  {roleLabel(member.role)}
                </span>
              }
              @if (canManage && member.userId !== user.id && member.role !== 'owner') {
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removing === member.id}
                  onClick={() => void removeMember(member.id)}
                >
                  {m.remove()}
                </Button>
              }
            </span>
          </li>
        }
      </ul>
      @if (memberError) {
        <FieldError>{memberError}</FieldError>
      }
      @if (pending.length > 0) {
        <PendingInvitations invitations={pending} />
      }
    </CardContent>
  </Card>
}

function PendingInvitations({ invitations }: { invitations: FullOrganization['invitations'] }) @{
  <>
    <Separator />
    <p className="text-xs font-medium text-muted-foreground">{m.pending_invitations()}</p>
    <ul className="flex flex-col gap-2">
      @for (const invitation of invitations; key invitation.id) {
        <li className="flex items-baseline justify-between gap-2 text-sm">
          <span>{invitation.email}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {roleLabel(invitation.role ?? 'member')}
          </span>
        </li>
      }
    </ul>
  </>
}
