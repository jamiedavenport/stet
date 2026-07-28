import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { z } from 'zod';

import { useAppRoute } from '#/use-app-route';
import { useAppForm } from '#/form';

// Requests an email change. Because the current address is verified, Better
// Auth sends the approval link to the current inbox, so a hijacked session
// cannot move the account silently.
export function ChangeEmail() @{
  const { user } = useAppRoute();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const schema = z.object({
    newEmail: z.email("Enter a valid email address"),
  });

  const form = useAppForm({
    defaultValues: { newEmail: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setSent(false);
      const { error } = await authClient.changeEmail({
        newEmail: value.newEmail,
        callbackURL: '/app/settings',
      });
      if (error) {
        setFormError(error.message ?? "Something went wrong. Try again.");
        return;
      }
      form.reset();
      setSent(true);
    },
  });

  <div className="flex flex-col gap-3">
    <p className="text-sm text-muted-foreground">
      {`Your current email is ${user.email}.`}
    </p>
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.AppField name="newEmail">
          {(field) => (
            <field.TextField
              label={"New email"}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          )}
        </form.AppField>
        @if (formError) {
          <FieldError>{formError}</FieldError>
        }
        @if (sent) {
          <p className="text-sm text-muted-foreground">{"Check your current email to confirm the change."}</p>
        }
        <form.AppForm>
          <form.SubmitButton label={"Change email"} pendingLabel={"Saving…"} />
        </form.AppForm>
      </FieldGroup>
    </form>
  </div>
}
