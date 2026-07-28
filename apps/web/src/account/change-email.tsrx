import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { m } from '@repo/i18n/messages';
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

  // Built in-render so m.*() resolves in the request's locale scope.
  const schema = z.object({
    newEmail: z.email(m.enter_a_valid_email_address()),
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
        setFormError(error.message ?? m.something_went_wrong_try_again());
        return;
      }
      form.reset();
      setSent(true);
    },
  });

  <div className="flex flex-col gap-3">
    <p className="text-sm text-muted-foreground">
      {m.your_current_email_is({ email: user.email })}
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
              label={m.new_email()}
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
          <p className="text-sm text-muted-foreground">{m.check_your_current_email_to_confirm()}</p>
        }
        <form.AppForm>
          <form.SubmitButton label={m.change_email_action()} pendingLabel={m.saving()} />
        </form.AppForm>
      </FieldGroup>
    </form>
  </div>
}
