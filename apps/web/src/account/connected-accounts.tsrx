import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';

import { accountsQuery } from '#/account/functions';
import type { SocialProvider } from '#/auth/functions';
import { socialProvidersQuery } from '#/auth/functions';

// Brand names are not translated.
const providerNames: Record<SocialProvider, string> = {
  google: 'Google',
  github: 'GitHub',
};

// Lists the social providers the server supports and lets the user connect or
// disconnect each one. Better Auth refuses to unlink a user's only sign-in
// method, so no extra guard is needed here.
export function ConnectedAccounts() @{
  const { data: accounts } = useQuery(accountsQuery);
  const { data: providers } = useQuery(socialProvidersQuery);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async (provider: SocialProvider) => {
    await authClient.linkSocial({ provider, callbackURL: '/app/settings' });
  };

  const disconnect = async (provider: SocialProvider) => {
    setPending(provider);
    setError(null);
    const { error: unlinkError } = await authClient.unlinkAccount({ providerId: provider });
    setPending(null);
    if (unlinkError) {
      setError(unlinkError.message ?? "Something went wrong. Try again.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: accountsQuery.queryKey });
  };

  const ready = accounts !== undefined && providers !== undefined;
  const providerList = providers ?? [];
  const linked = new Set((accounts ?? []).map((account) => account.providerId));

  <>
    @if (!ready) {
      <p className="text-sm text-muted-foreground">{"Loading…"}</p>
    } @else {
      @if (providerList.length === 0) {
        <p className="text-sm text-muted-foreground">{"No social providers are configured."}</p>
      } @else {
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            @for (const provider of providerList; key provider) {
              <li className="flex items-center justify-between gap-2 text-sm">
                <span>{providerNames[provider]}</span>
                @if (linked.has(provider)) {
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending === provider}
                    onClick={() => void disconnect(provider)}
                  >
                    {"Disconnect"}
                  </Button>
                } @else {
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void connect(provider)}
                  >
                    {"Connect"}
                  </Button>
                }
              </li>
            }
          </ul>
          @if (error) {
            <FieldError>{error}</FieldError>
          }
        </div>
      }
    }
  </>
}
