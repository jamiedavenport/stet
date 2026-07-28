import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { getRouteApi, Link } from '@tanstack/react-router';
import { z } from 'zod';

import { useAppForm } from '#/form';

const route = getRouteApi('/sign/reset');

type View = 'invalid' | 'updated' | 'form';

export function ResetPassword() @{
  const { token, error } = route.useSearch();
  const brandName = brand.name;

  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Built in-render so m.*() resolves in the request's locale scope.
  const resetSchema = z.object({
    password: z.string().min(8, m.password_must_be_at_least_8()),
  });

  const form = useAppForm({
    defaultValues: {
      password: '',
    },
    validators: {
      onSubmit: resetSchema,
    },
    onSubmit: async ({ value }) => {
      if (!token) return;
      setFormError(null);
      const { error: resetError } = await authClient.resetPassword({
        newPassword: value.password,
        token,
      });
      if (resetError) {
        setFormError(resetError.message ?? m.unable_to_reset_password());
        return;
      }
      setDone(true);
    },
  });

  let view: View;
  if (error !== undefined || token === undefined) {
    view = 'invalid';
  } else if (done) {
    view = 'updated';
  } else {
    view = 'form';
  }

  <Card>
    @switch (view) {
      @case 'invalid': {
        <>
          <CardHeader>
            <CardTitle className="text-balance">{m.reset_link_invalid()}</CardTitle>
            <CardDescription className="text-pretty">
              {m.this_password_reset_link_is_invalid()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                to="/sign/forgot"
                search
                className="text-foreground underline underline-offset-4"
              >
                {m.request_a_new_reset_link()}
              </Link>
            </p>
          </CardContent>
        </>
      }
      @case 'updated': {
        <>
          <CardHeader>
            <CardTitle className="text-balance">{m.password_updated()}</CardTitle>
            <CardDescription className="text-pretty">
              {m.your_password_has_been_reset_sign()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
                {m.go_to_sign_in()}
              </Link>
            </p>
          </CardContent>
        </>
      }
      @default: {
        <>
          <CardHeader>
            <CardTitle className="text-balance">{m.choose_a_new_password()}</CardTitle>
            <CardDescription className="text-pretty">
              {m.enter_a_new_password_for_your({ brandName })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
              }}
            >
              <FieldGroup>
                <form.AppField name="password">
                  {(field) => (
                    <field.TextField
                      label={m.new_password()}
                      type="password"
                      autoComplete="new-password"
                    />
                  )}
                </form.AppField>
                @if (formError) {
                  <FieldError>{formError}</FieldError>
                }
                <form.AppForm>
                  <form.SubmitButton label={m.reset_password()} pendingLabel={m.resetting()} />
                </form.AppForm>
              </FieldGroup>
            </form>
          </CardContent>
        </>
      }
    }
  </Card>
}
