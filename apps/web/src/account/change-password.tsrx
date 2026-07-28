import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import { useAppForm } from '#/form';
import { accountsQuery, hasPassword, sessionsQuery, setInitialPassword } from '#/account/functions';
import { clearSessionContext } from '#/session';

// Loads the accounts once so the inner form sees a stable credentialUser flag
// (its validation schema depends on it, so it must not flip mid-mount).
export function ChangePassword() @{
  const { data: accounts } = useQuery(accountsQuery);

  <>
    @if (accounts === undefined) {
      <p className="text-sm text-muted-foreground">{"Loading…"}</p>
    } @else {
      <PasswordForm credentialUser={hasPassword(accounts)} />
    }
  </>
}

// Change-password for users who already have a password; set-password (no
// current password) for social-only users who never had one.
function PasswordForm({ credentialUser }: { credentialUser: boolean }) @{
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const schema = z.object({
    // Social-only users never see this field; keep it a plain string so the
    // form's value types stay in sync, and only require it for credential users.
    currentPassword: credentialUser
      ? z.string().min(1, "Enter your current password")
      : z.string(),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    revokeOtherSessions: z.boolean(),
  });

  const form = useAppForm({
    defaultValues: { currentPassword: '', newPassword: '', revokeOtherSessions: false },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      let message: string | null = null;
      if (credentialUser) {
        const { error } = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          revokeOtherSessions: value.revokeOtherSessions,
        });
        if (error) {
          message = error.message ?? "Something went wrong. Try again.";
        }
      } else {
        try {
          await setInitialPassword({ data: value.newPassword });
        } catch (thrown) {
          message = thrown instanceof Error ? thrown.message : "Something went wrong. Try again.";
        }
      }
      if (message !== null) {
        setFormError(message);
        return;
      }
      form.reset();
      setDone(true);
      // A social user just gained a credential account; refresh so the form
      // switches to change-password mode. Revoking other sessions also
      // changes what the active-sessions card should show.
      await queryClient.invalidateQueries({ queryKey: accountsQuery.queryKey });
      await queryClient.invalidateQueries({ queryKey: sessionsQuery.queryKey });
      clearSessionContext(queryClient);
      await router.invalidate();
    },
  });

  <form
    onSubmit={(event) => {
      event.preventDefault();
      setDone(false);
      void form.handleSubmit();
    }}
  >
    <FieldGroup>
      @if (credentialUser) {
        <form.AppField name="currentPassword">
          {(field) => (
            <field.TextField
              label={"Current password"}
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.AppField>
      }
      <form.AppField name="newPassword">
        {(field) => (
          <field.TextField label={"New password"} type="password" autoComplete="new-password" />
        )}
      </form.AppField>
      @if (credentialUser) {
        <form.AppField name="revokeOtherSessions">
          {(field) => (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={field.state.value}
                onChange={(event) => field.handleChange(event.target.checked)}
              />
              {"Sign out other devices"}
            </label>
          )}
        </form.AppField>
      }
      @if (formError) {
        <FieldError>{formError}</FieldError>
      }
      @if (done) {
        <p className="text-sm text-muted-foreground">{"Password updated"}</p>
      }
      <form.AppForm>
        <form.SubmitButton
          label={credentialUser ? "Update password" : "Set password"}
          pendingLabel={"Saving…"}
        />
      </form.AppForm>
    </FieldGroup>
  </form>
}
