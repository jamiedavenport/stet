import { useEffect, useState } from 'react';
import { authClient } from '@repo/auth/client';
import { brand } from '@repo/brand';
import { m } from '@repo/i18n/messages';
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

export const Route = createFileRoute('/sign/in')({
  component: SignIn,
});

function SignIn() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();
  const { providers } = signRoute.useLoaderData();
  const [formError, setFormError] = useState<string | null>(null);
  const captcha = useCaptcha();
  const brandName = brand.name;

  const completeSignIn = async () => {
    clearSessionContext(queryClient);
    await router.invalidate();
    await navigate({ to: redirect ?? '/app' });
  };

  const signInWithPasskey = async () => {
    setFormError(null);
    const { data, error } = await authClient.signIn.passkey();
    if (error) {
      setFormError(error.message ?? m.unable_to_sign_in_with_passkey());
      return;
    }
    if (data !== null) {
      await completeSignIn();
    }
  };

  // Conditional UI: preload passkeys so the browser offers them in the email
  // field's autofill (autoComplete "webauthn"). The promise resolves only if
  // the user picks one.
  useEffect(() => {
    if (
      typeof window.PublicKeyCredential === 'undefined' ||
      typeof window.PublicKeyCredential.isConditionalMediationAvailable !== 'function'
    ) {
      return;
    }
    let cancelled = false;
    void window.PublicKeyCredential.isConditionalMediationAvailable().then(async (available) => {
      if (!available || cancelled) {
        return;
      }
      const { data } = await authClient.signIn.passkey({ autoFill: true });
      if (data !== null && !cancelled) {
        await completeSignIn();
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Built in-render so m.*() resolves in the request's locale scope.
  const signInSchema = z.object({
    email: z.email(m.enter_a_valid_email_address()),
    password: z.string().min(8, m.password_must_be_at_least_8()),
  });

  const form = useAppForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { data, error } = await authClient.signIn.email(value, {
        headers: captcha.headers,
      });
      if (error) {
        // The admin plugin's ban message is server-built English; the code is
        // what carries over into the signed-out user's own language.
        captcha.reset();
        if (error.code === 'BANNED_USER') {
          setFormError(m.your_account_has_been_suspended());
          return;
        }
        setFormError(error.message ?? m.unable_to_sign_in());
        return;
      }
      // Enrolled users aren't signed in yet: send them to the second-factor
      // page, carrying the redirect target through the hop.
      if (data !== null && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
        await navigate({ to: '/sign/2fa', search: { redirect } });
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
        <CardTitle className="text-balance">{m.welcome_back()}</CardTitle>
        <CardDescription className="text-pretty">
          {m.sign_in_to_your_account({ brandName })}
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
            <form.AppField name="email">
              {(field) => (
                <field.TextField
                  label={m.email()}
                  type="email"
                  autoComplete="email webauthn"
                  placeholder="you@example.com"
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.TextField
                  label={m.password()}
                  type="password"
                  autoComplete="current-password"
                />
              )}
            </form.AppField>
            <p className="text-right text-sm">
              <Link
                to="/sign/forgot"
                search
                className="text-muted-foreground underline underline-offset-4"
              >
                {m.forgot_password()}
              </Link>
            </p>
            {captcha.widgetProps !== null ? <Turnstile {...captcha.widgetProps} /> : null}
            {formError ? <FieldError>{formError}</FieldError> : null}
            <form.AppForm>
              <form.SubmitButton
                label={m.sign_in()}
                pendingLabel={m.signing_in()}
                disabled={captcha.submitDisabled}
              />
            </form.AppForm>
            <p className="text-center text-sm">
              <button
                type="button"
                onClick={() => void signInWithPasskey()}
                className="text-muted-foreground underline underline-offset-4"
              >
                {m.sign_in_with_a_passkey()}
              </button>
            </p>
            <p className="text-center text-sm">
              <Link
                to="/sign/link"
                search
                className="text-muted-foreground underline underline-offset-4"
              >
                {m.email_me_a_sign_in_link()}
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              {m.new_to_brand({ brandName })}{' '}
              <Link to="/sign/up" search className="text-foreground underline underline-offset-4">
                {m.create_an_account_link()}
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
