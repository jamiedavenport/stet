import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';

import type { AdminUser } from '#/admin/functions';

export function AdminUserRow({
  user,
  viewerId,
  onChanged,
}: {
  user: AdminUser;
  viewerId: string;
  onChanged: () => Promise<void>;
}) @{
  const [confirmingBan, setConfirmingBan] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSelf = user.id === viewerId;
  const isAdmin = user.role === 'admin';

  const run = async (action: () => Promise<{ error: { message?: string } | null }>) => {
    setBusy(true);
    setError(null);
    const { error: failure } = await action();
    setBusy(false);
    if (failure !== null) {
      setError(failure.message ?? "Something went wrong. Try again.");
      return;
    }
    setConfirmingBan(false);
    setReason('');
    await onChanged();
  };

  // A hard navigation, not router.invalidate(): the router still holds the
  // admin's session, so a client-side hop would re-run this page's guard as
  // the impersonated user and flash the 404.
  const impersonate = async () => {
    setBusy(true);
    setError(null);
    const { error: failure } = await authClient.admin.impersonateUser({ userId: user.id });
    if (failure !== null) {
      setBusy(false);
      setError(failure.message ?? "Something went wrong. Try again.");
      return;
    }
    window.location.href = '/app';
  };

  <li className="flex flex-col gap-2 border-b pb-3 last:border-b-0">
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="font-medium">{user.name}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{user.email}</span>
      @if (isAdmin) {
        <Badge variant="secondary">{"Admin"}</Badge>
      }
      @if (user.banned) {
        <Badge variant="destructive">{"Banned"}</Badge>
      }
    </div>
    @if (user.banned && user.banReason !== null) {
      <p className="text-xs text-muted-foreground">{`Reason: ${user.banReason}`}</p>
    }
    @if (confirmingBan) {
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label={"Ban reason (optional)"}
          placeholder={"Ban reason (optional)"}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() =>
            void run(() =>
              authClient.admin.banUser({
                userId: user.id,
                ...(reason.trim() === '' ? {} : { banReason: reason.trim() }),
              }),
            )
          }
        >
          {"Yes, ban"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingBan(false)}>
          {"Cancel"}
        </Button>
      </div>
    }
    @if (!isSelf && !confirmingBan) {
      <div className="flex flex-wrap gap-2">
        @if (user.banned) {
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => authClient.admin.unbanUser({ userId: user.id }))}
          >
            {"Unban"}
          </Button>
        }
        @if (!user.banned) {
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirmingBan(true)}
          >
            {"Ban"}
          </Button>
        }
        @if (!user.banned && !isAdmin) {
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void impersonate()}>
            {"Impersonate"}
          </Button>
        }
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void run(() =>
              authClient.admin.setRole({ userId: user.id, role: isAdmin ? 'user' : 'admin' }),
            )
          }
        >
          {isAdmin ? "Revoke admin" : "Make admin"}
        </Button>
      </div>
    }
    @if (error !== null) {
      <FieldError>{error}</FieldError>
    }
  </li>
}
