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
import { Link } from '@tanstack/react-router';
import { z } from 'zod';

import { Turnstile } from '@marsidev/react-turnstile';

import { useAppForm } from '#/form';
import { useCaptcha } from '#/auth/turnstile';

export function ForgotPassword() @{
  const [formError, setFormError] = useState<string | null>(null);
  const captcha = useCaptcha();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const forgotSchema = z.object({
    email: z.email("Enter a valid email address"),
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
        setFormError(error.message ?? "Unable to send reset email");
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
            {`If an account exists for ${sentTo}, we sent a link to reset your password. The link expires in one hour.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            {"Remembered it?"}{' '}
            <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
              {"Back to sign in"}
            </Link>
          </p>
        </CardContent>
      </>
    } @else {
      <>
        <CardHeader>
          <CardTitle className="text-balance">{"Forgot your password?"}</CardTitle>
          <CardDescription className="text-pretty">
            {"Enter your email and we'll send you a reset link."}
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
                  label={"Send reset link"}
                  pendingLabel={"Sending…"}
                  disabled={captcha.submitDisabled}
                />
              </form.AppForm>
              <p className="text-center text-sm text-muted-foreground">
                {"Remembered it?"}{' '}
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
