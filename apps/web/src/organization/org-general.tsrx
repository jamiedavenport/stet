import { useState } from 'react';
import { authClient } from '@repo/auth/client';
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

  const schema = z.object({
    name: z.string().min(1, "Enter an organization name"),
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
        setFormError(error.message ?? "Something went wrong. Try again.");
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
      <CardTitle>{"Organization"}</CardTitle>
      <CardDescription>{"Your organization's name and details."}</CardDescription>
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
              {(field) => <field.TextField label={"Organization name"} />}
            </form.AppField>
            @if (formError) {
              <FieldError>{formError}</FieldError>
            }
            @if (done) {
              <p className="text-sm text-muted-foreground">{"Saved"}</p>
            }
            <form.AppForm>
              <form.SubmitButton label={"Save"} pendingLabel={"Saving…"} />
            </form.AppForm>
          </FieldGroup>
        </form>
      } @else {
        <p className="text-sm text-muted-foreground">{"Only owners and admins can manage billing."}</p>
      }
    </CardContent>
  </Card>
}
