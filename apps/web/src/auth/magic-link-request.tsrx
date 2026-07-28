import { useState } from 'react';
import { authClient } from '@repo/auth/client';
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

  const linkSchema = z.object({
    email: z.email("Enter a valid email address"),
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
        setFormError(error.message ?? "Unable to send the sign-in link.");
        return;
      }
      setSentTo(value.email);
    },
  });

  <Card>
    @if (sentTo !== null) {
      <>
        <CardHeader>
          <CardTitle className="text-balance">{"Check your email"}</CardTitle>
          <CardDescription className="text-pretty">
            {`If an account exists for ${sentTo}, we sent a one-time sign-in link. The link expires in five minutes.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
              {"Back to sign in"}
            </Link>
          </p>
        </CardContent>
      </>
    } @else {
      <>
        <CardHeader>
          <CardTitle className="text-balance">{"Sign in with a link"}</CardTitle>
          <CardDescription className="text-pretty">
            {"Enter your email and we'll send you a one-time sign-in link."}
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
                <FieldError>{"That sign-in link is invalid or has expired. Request a new one below."}</FieldError>
              }
              <form.AppField name="email">
                {(field) => (
                  <field.TextField
                    label={"Email"}
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
                  label={"Send sign-in link"}
                  pendingLabel={"Sending…"}
                  disabled={captcha.submitDisabled}
                />
              </form.AppForm>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
                  {"Back to sign in"}
                </Link>
              </p>
            </FieldGroup>
          </form>
        </CardContent>
      </>
    }
  </Card>
}
