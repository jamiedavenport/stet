import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';

// Starts account deletion. Better Auth mails a confirmation link (see
// sendDeleteAccountVerification in private/auth), so nothing is destroyed until
// the user clicks it; this keeps the flow safe for social-only users too.
export function DeleteAccount() @{
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestDeletion = async () => {
    setPending(true);
    setError(null);
    const { error: deleteError } = await authClient.deleteUser({ callbackURL: '/' });
    setPending(false);
    if (deleteError) {
      setError(deleteError.message ?? "Something went wrong. Try again.");
      return;
    }
    setConfirming(false);
    setSent(true);
  };

  <>
    @if (sent) {
      <p className="text-sm text-muted-foreground">{"Check your email to confirm account deletion."}</p>
    } @else {
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{"Deleting your account is permanent and can't be undone."}</p>
        @if (confirming) {
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => void requestDeletion()}
            >
              {pending ? "Working…" : "Yes, delete my account"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              {"Cancel"}
            </Button>
          </div>
        } @else {
          <div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              {"Delete account"}
            </Button>
          </div>
        }
        @if (error) {
          <FieldError>{error}</FieldError>
        }
      </div>
    }
  </>
}
