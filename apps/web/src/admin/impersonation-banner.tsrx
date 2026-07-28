import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { Button } from '@repo/ui/components/button';

import { useAppRoute } from '#/use-app-route';

// Shown on every app page while an admin is acting as another user, so the
// session is never mistaken for the admin's own.
export function ImpersonationBanner() @{
  const { session, user } = useAppRoute();
  const [busy, setBusy] = useState(false);

  const stop = async () => {
    setBusy(true);
    await authClient.admin.stopImpersonating();
    // Full reload for the same reason as starting: the router's cached
    // session belongs to the identity being left behind.
    window.location.href = '/app/admin/users';
  };

  @if (session.session.impersonatedBy !== undefined && session.session.impersonatedBy !== null) {
    <div className="flex flex-wrap items-center gap-2 border-b bg-destructive/10 px-4 py-2 text-sm">
      <span className="text-destructive">{`Viewing as ${user.name}`}</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="ml-auto"
        disabled={busy}
        onClick={() => void stop()}
      >
        {"Stop impersonating"}
      </Button>
    </div>
  }
}
