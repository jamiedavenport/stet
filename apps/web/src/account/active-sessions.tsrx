import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';

import { useAppRoute } from '#/use-app-route';
import { sessionsQuery } from '#/account/functions';

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Lists the user's active sessions and lets them revoke any device or sign out
// everywhere else. The current session is flagged and cannot be revoked from
// here (that is what Sign out does).
export function ActiveSessions() @{
  const { session } = useAppRoute();
  const { data: sessions } = useQuery(sessionsQuery);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentToken = session.session.token;
  const refresh = () => queryClient.invalidateQueries({ queryKey: sessionsQuery.queryKey });

  const revoke = async (token: string) => {
    setPending(token);
    setError(null);
    const { error: revokeError } = await authClient.revokeSession({ token });
    setPending(null);
    if (revokeError) {
      setError(revokeError.message ?? "Something went wrong. Try again.");
      return;
    }
    await refresh();
  };

  const revokeOthers = async () => {
    setError(null);
    const { error: revokeError } = await authClient.revokeOtherSessions();
    if (revokeError) {
      setError(revokeError.message ?? "Something went wrong. Try again.");
      return;
    }
    await refresh();
  };

  const list = sessions ?? [];

  <>
    @if (sessions === undefined) {
      <p className="text-sm text-muted-foreground">{"Loading…"}</p>
    } @else {
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-3">
          @for (const item of list; key item.id) {
            <li className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 truncate">
                  <span className="truncate">{item.userAgent ?? "Unknown device"}</span>
                  @if (item.token === currentToken) {
                    <Badge>{"This device"}</Badge>
                  }
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
              @if (item.token !== currentToken) {
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending === item.token}
                  onClick={() => void revoke(item.token)}
                >
                  {"Revoke"}
                </Button>
              }
            </li>
          }
        </ul>
        @if (list.length > 1) {
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => void revokeOthers()}>
              {"Sign out all other sessions"}
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
