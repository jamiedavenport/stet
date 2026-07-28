import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { brand } from '@repo/brand';
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

  const resetSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
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
        setFormError(resetError.message ?? "Unable to reset password");
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
            <CardTitle className="text-balance">{"Reset link invalid"}</CardTitle>
            <CardDescription className="text-pretty">
              {"This password reset link is invalid or has expired. Request a new one to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                to="/sign/forgot"
                search
                className="text-foreground underline underline-offset-4"
              >
                {"Request a new reset link"}
              </Link>
            </p>
          </CardContent>
        </>
      }
      @case 'updated': {
        <>
          <CardHeader>
            <CardTitle className="text-balance">{"Password updated"}</CardTitle>
            <CardDescription className="text-pretty">
              {"Your password has been reset. Sign in with your new password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
                {"Go to sign in"}
              </Link>
            </p>
          </CardContent>
        </>
      }
      @default: {
        <>
          <CardHeader>
            <CardTitle className="text-balance">{"Choose a new password"}</CardTitle>
            <CardDescription className="text-pretty">
              {`Enter a new password for your ${brandName} account.`}
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
                      label={"New password"}
                      type="password"
                      autoComplete="new-password"
                    />
                  )}
                </form.AppField>
                @if (formError) {
                  <FieldError>{formError}</FieldError>
                }
                <form.AppForm>
                  <form.SubmitButton label={"Reset password"} pendingLabel={"Resetting…"} />
                </form.AppForm>
              </FieldGroup>
            </form>
          </CardContent>
        </>
      }
    }
  </Card>
}
