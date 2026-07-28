import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';

import { passkeysQuery } from '#/account/functions';

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Registers and removes WebAuthn passkeys. Registration runs entirely in the
// browser's passkey prompt; a dismissed prompt surfaces as an error message.
export function PasskeySettings() @{
  const { data: passkeys } = useQuery(passkeysQuery);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: passkeysQuery.queryKey });

  const add = async () => {
    setAdding(true);
    setError(null);
    const result = await authClient.passkey.addPasskey();
    setAdding(false);
    if (result?.error) {
      setError(result.error.message ?? "Unable to add a passkey.");
      return;
    }
    await refresh();
  };

  const remove = async (id: string) => {
    setRemoving(id);
    setError(null);
    const { error: removeError } = await authClient.passkey.deletePasskey({ id });
    setRemoving(null);
    if (removeError) {
      setError(removeError.message ?? "Something went wrong. Try again.");
      return;
    }
    await refresh();
  };

  <>
    @if (passkeys === undefined) {
      <p className="text-sm text-muted-foreground">{"Loading…"}</p>
    } @else {
      <div className="flex flex-col gap-3">
        @if (passkeys.length === 0) {
          <p className="text-sm text-muted-foreground">{"You haven't added any passkeys yet."}</p>
        } @else {
          <ul className="flex flex-col gap-3">
            @for (const item of passkeys; key item.id) {
              <li className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{item.name ?? "Passkey"}</span>
                  @if (item.createdAt) {
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  }
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={removing === item.id}
                  onClick={() => void remove(item.id)}
                >
                  {"Remove"}
                </Button>
              </li>
            }
          </ul>
        }
        <div>
          <Button type="button" size="sm" disabled={adding} onClick={() => void add()}>
            {adding ? "Waiting for your device…" : "Add a passkey"}
          </Button>
        </div>
        @if (error) {
          <FieldError>{error}</FieldError>
        }
      </div>
    }
  </>
}
