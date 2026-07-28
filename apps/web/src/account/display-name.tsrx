import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQueryClient } from '@tanstack/react-query';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import { useAppRoute } from '#/use-app-route';
import { useAppForm } from '#/form';
import { clearSessionContext } from '#/session';

// Edits the user's display name. Photo is handled by ProfilePhoto alongside it.
export function DisplayName() @{
  const { user } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const schema = z.object({
    name: z.string().min(1, "Enter your name"),
  });

  const form = useAppForm({
    defaultValues: { name: user.name },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.updateUser({ name: value.name });
      if (error) {
        setFormError(error.message ?? "Something went wrong. Try again.");
        return;
      }
      setDone(true);
      clearSessionContext(queryClient);
      await router.invalidate();
    },
  });

  <form
    onSubmit={(event) => {
      event.preventDefault();
      setDone(false);
      void form.handleSubmit();
    }}
  >
    <FieldGroup>
      <form.AppField name="name">
        {(field) => <field.TextField label={"Name"} autoComplete="name" />}
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
}
