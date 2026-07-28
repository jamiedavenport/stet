import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { getRouteApi, useNavigate, useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import { useAppForm } from '#/form';
import { clearSessionContext } from '#/session';

const route = getRouteApi('/sign/2fa');

// The second step of sign-in for enrolled users: verify a TOTP code, or fall
// back to a single-use backup code. The sign-in page navigates here with the
// pending 2FA cookie already set.
export function TwoFactorVerify() @{
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { redirect } = route.useSearch();
  const [useBackup, setUseBackup] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = z.object({
    code: z.string().min(6, "Enter the code from your authenticator app."),
  });

  const form = useAppForm({
    defaultValues: { code: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const code = value.code.trim();
      const { error } = useBackup
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code, trustDevice });
      if (error) {
        setFormError(error.message ?? "Unable to verify this code");
        return;
      }
      clearSessionContext(queryClient);
      await router.invalidate();
      await navigate({ to: redirect ?? '/app' });
    },
  });

  <Card>
    <CardHeader>
      <CardTitle className="text-balance">{"Two-step verification"}</CardTitle>
      <CardDescription className="text-pretty">
        {useBackup
          ? "Enter one of your backup codes."
          : "Enter the code from your authenticator app."}
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
          <form.AppField name="code">
            {(field) => (
              <field.TextField
                label={useBackup ? "Backup code" : "Authentication code"}
                autoComplete="one-time-code"
                inputMode={useBackup ? 'text' : 'numeric'}
                placeholder={useBackup ? 'XXXXX-XXXXX' : '123456'}
              />
            )}
          </form.AppField>
          @if (!useBackup) {
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={trustDevice}
                onChange={(event) => setTrustDevice(event.target.checked)}
              />
              {"Trust this device for 30 days"}
            </label>
          }
          @if (formError) {
            <FieldError>{formError}</FieldError>
          }
          <form.AppForm>
            <form.SubmitButton label={"Verify"} pendingLabel={"Verifying…"} />
          </form.AppForm>
          <p className="text-center text-sm">
            <button
              type="button"
              className="text-muted-foreground underline underline-offset-4"
              onClick={() => {
                setUseBackup((previous) => !previous);
                setFormError(null);
                form.reset();
              }}
            >
              {useBackup ? "Use your authenticator app" : "Use a backup code"}
            </button>
          </p>
        </FieldGroup>
      </form>
    </CardContent>
  </Card>
}
