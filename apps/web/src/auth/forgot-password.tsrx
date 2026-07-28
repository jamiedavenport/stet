import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { m } from '@repo/i18n/messages';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { Link } from '@tanstack/react-router';
import { z } from 'zod';

import { Turnstile } from '@marsidev/react-turnstile';

import { useAppForm } from '#/form';
import { useCaptcha } from '#/auth/turnstile';

export function ForgotPassword() @{
  const [formError, setFormError] = useState<string | null>(null);
  const captcha = useCaptcha();
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Built in-render so m.*() resolves in the request's locale scope.
  const forgotSchema = z.object({
    email: z.email(m.enter_a_valid_email_address()),
  });

  const form = useAppForm({
    defaultValues: {
      email: '',
    },
    validators: {
      onSubmit: forgotSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.requestPasswordReset(
        {
          email: value.email,
          redirectTo: '/sign/reset',
        },
        { headers: captcha.headers },
      );
      if (error) {
        captcha.reset();
        setFormError(error.message ?? m.unable_to_send_reset_email());
        return;
      }
      setSentTo(value.email);
    },
  });

  <Card>
    @if (sentTo !== null) {
      <>
        <CardHeader>
          <CardTitle className="text-balance">{m.check_your_email()}</CardTitle>
          <CardDescription className="text-pretty">
            {m.if_an_account_exists_for_we({ email: sentTo })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            {m.remembered_it()}{' '}
            <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
              {m.back_to_sign_in()}
            </Link>
          </p>
        </CardContent>
      </>
    } @else {
      <>
        <CardHeader>
          <CardTitle className="text-balance">{m.forgot_your_password()}</CardTitle>
          <CardDescription className="text-pretty">
            {m.enter_your_email_and_we_ll()}
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
              <form.AppField name="email">
                {(field) => (
                  <field.TextField
                    label={m.email()}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                )}
              </form.AppField>
              @if (captcha.widgetProps !== null) {
                <Turnstile {...captcha.widgetProps} />
              }
              @if (formError) {
                <FieldError>{formError}</FieldError>
              }
              <form.AppForm>
                <form.SubmitButton
                  label={m.send_reset_link()}
                  pendingLabel={m.sending()}
                  disabled={captcha.submitDisabled}
                />
              </form.AppForm>
              <p className="text-center text-sm text-muted-foreground">
                {m.remembered_it()}{' '}
                <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
                  {m.back_to_sign_in()}
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </>
    }
  </Card>
}
