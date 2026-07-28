import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { m } from '@repo/i18n/messages';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import { useAppRoute } from '#/use-app-route';
import { useAppForm } from '#/form';
import { fullOrganizationQuery } from '#/organization/functions';
import { clearSessionContext } from '#/session';

// Renames the active organization. Only owners and admins may edit; everyone
// else sees a read-only note.
export function OrgGeneral() @{
  const { activeOrganization, user } = useAppRoute();
  const { data: org } = useSuspenseQuery(fullOrganizationQuery(activeOrganization.id));
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const membership = org.members.find((member) => member.userId === user.id);
  const canManage = membership?.role === 'owner' || membership?.role === 'admin';

  // Built in-render so m.*() resolves in the request's locale scope.
  const schema = z.object({
    name: z.string().min(1, m.enter_an_organization_name()),
  });

  const form = useAppForm({
    defaultValues: { name: org.name },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.organization.update({
        data: { name: value.name },
        organizationId: activeOrganization.id,
      });
      if (error) {
        setFormError(error.message ?? m.something_went_wrong_try_again());
        return;
      }
      setDone(true);
      // Refresh the switcher and roster so the new name shows everywhere.
      clearSessionContext(queryClient);
      await queryClient.invalidateQueries({
        queryKey: fullOrganizationQuery(activeOrganization.id).queryKey,
      });
      await router.invalidate();
    },
  });

  <Card>
    <CardHeader>
      <CardTitle>{m.organization()}</CardTitle>
      <CardDescription>{m.your_organizations_name_and_details()}</CardDescription>
    </CardHeader>
    <CardContent>
      @if (canManage) {
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setDone(false);
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.AppField name="name">
              {(field) => <field.TextField label={m.organization_name()} />}
            </form.AppField>
            @if (formError) {
              <FieldError>{formError}</FieldError>
            }
            @if (done) {
              <p className="text-sm text-muted-foreground">{m.saved()}</p>
            }
            <form.AppForm>
              <form.SubmitButton label={m.save()} pendingLabel={m.saving()} />
            </form.AppForm>
          </FieldGroup>
        </form>
      } @else {
        <p className="text-sm text-muted-foreground">{m.only_owners_and_admins_can_manage()}</p>
      }
    </CardContent>
  </Card>
}
