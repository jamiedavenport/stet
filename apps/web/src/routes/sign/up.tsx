import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { brand } from '@repo/brand';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import { getRouteApi } from '@tanstack/react-router';

import { Turnstile } from '@marsidev/react-turnstile';

import { SocialSignIn } from '#/auth/social-sign-in.tsrx';
import { useCaptcha } from '#/auth/turnstile';
import { useAppForm } from '#/form';
import { clearSessionContext } from '#/session';

const signRoute = getRouteApi('/sign');

export const Route = createFileRoute('/sign/up')({
  component: SignUp,
});

function SignUp() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();
  const { providers } = signRoute.useLoaderData();
  const [formError, setFormError] = useState<string | null>(null);
  const captcha = useCaptcha();
  const brandName = brand.name;

  const signUpSchema = z.object({
    name: z.string().min(1, 'Enter your name'),
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });

  const form = useAppForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.signUp.email(value, {
        headers: captcha.headers,
      });
      if (error) {
        captcha.reset();
        setFormError(error.message ?? 'Unable to create account');
        return;
      }
      clearSessionContext(queryClient);
      await router.invalidate();
      await navigate({ to: redirect ?? '/app' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-balance">{'Create your account'}</CardTitle>
        <CardDescription className="text-pretty">
          {`Get started with ${brandName} in seconds.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SocialSignIn providers={providers} callbackURL={redirect ?? '/app'} />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.AppField name="name">
              {(field) => (
                <field.TextField label={'Name'} autoComplete="name" placeholder={'Your name'} />
              )}
            </form.AppField>
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label={'Email'}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField label={'Password'} type="password" autoComplete="new-password" />
              )}
            </form.AppField>
            {captcha.widgetProps !== null ? <Turnstile {...captcha.widgetProps} /> : null}
            {formError ? <FieldError>{formError}</FieldError> : null}
            <form.AppForm>
              <form.SubmitButton
                label={'Create account'}
                pendingLabel={'Creating account…'}
                disabled={captcha.submitDisabled}
              />
            </form.AppForm>
            <p className="text-center text-sm text-muted-foreground">
              {'Already have an account?'}{' '}
              <Link to="/sign/in" search className="text-foreground underline underline-offset-4">
                {'Sign in'}
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
