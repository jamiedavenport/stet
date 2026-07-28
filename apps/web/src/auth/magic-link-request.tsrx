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
import { Link, getRouteApi } from '@tanstack/react-router';
import { z } from 'zod';

import { Turnstile } from '@marsidev/react-turnstile';

import { useAppForm } from '#/form';
import { useCaptcha } from '#/auth/turnstile';

const linkRoute = getRouteApi('/sign/link');

// Requests a one-time emailed sign-in link. The sent state shows for unknown
// addresses too (the server skips the send instead of erroring), so the form
// never reveals whether an account exists.
export function MagicLinkRequest() @{
  const { error: linkError, redirect } = linkRoute.useSearch();
  const [formError, setFormError] = useState<string | null>(null);
  const captcha = useCaptcha();
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Built in-render so m.*() resolves in the request's locale scope.
  const linkSchema = z.object({
    email: z.email(m.enter_a_valid_email_address()),
  });

  const form = useAppForm({
    defaultValues: {
      email: '',
    },
    validators: {
      onSubmit: linkSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.signIn.magicLink(
        {
          email: value.email,
          callbackURL: redirect ?? '/app',
          errorCallbackURL: '/sign/link',
        },
        { headers: captcha.headers },
      );
      if (error) {
        captcha.reset();
        setFormError(error.message ?? m.unable_to_send_sign_in_link());
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
            {m.if_an_account_exists_sign_in_link({ email: sentTo })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
              {m.back_to_sign_in()}
            </Link>
          </p>
        </CardContent>
      </>
    } @else {
      <>
        <CardHeader>
          <CardTitle className="text-balance">{m.sign_in_with_a_link()}</CardTitle>
          <CardDescription className="text-pretty">
            {m.enter_your_email_for_a_sign_in_link()}
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
              @if (linkError !== undefined) {
                <FieldError>{m.sign_in_link_invalid_or_expired()}</FieldError>
              }
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
                  label={m.send_sign_in_link()}
                  pendingLabel={m.sending()}
                  disabled={captcha.submitDisabled}
                />
              </form.AppForm>
              <p className="text-center text-sm text-muted-foreground">
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
