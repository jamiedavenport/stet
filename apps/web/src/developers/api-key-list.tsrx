import { useState } from 'react';
import { Button } from '@repo/ui/components/button';

import { revokeApiKey } from '#/developers/functions';
import type { ApiKeysData } from '#/developers/functions';
import { timeAgo } from '#/time';

type ApiKey = ApiKeysData[number];

function lastUsed(apiKey: ApiKey): string {
  if (apiKey.lastRequest === null) {
    return 'Never used';
  }
  return `Last used ${timeAgo(apiKey.lastRequest)}`;
}

export function ApiKeyList({
  keys,
  onRevoked,
}: {
  keys: ApiKeysData;
  onRevoked: () => Promise<void>;
}) @{
  <>
    @if (keys.length === 0) {
      <p className="text-sm text-muted-foreground">{"No keys yet. Create one to call the API."}</p>
    } @else {
      <ul className="flex flex-col divide-y">
        @for (const apiKey of keys; key apiKey.id) {
          <ApiKeyRow apiKey={apiKey} onRevoked={onRevoked} />
        }
      </ul>
    }
  </>
}

function ApiKeyRow({ apiKey, onRevoked }: { apiKey: ApiKey; onRevoked: () => Promise<void> }) @{
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const revoke = async () => {
    setPending(true);
    await revokeApiKey({ data: { id: apiKey.id } });
    setPending(false);
    setConfirming(false);
    await onRevoked();
  };

  <li className="flex items-center justify-between gap-3 py-3">
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-medium">{apiKey.name ?? "Unnamed key"}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        <code className="font-mono">{`${apiKey.start ?? ''}…`}</code>
        <span>{`Created ${timeAgo(apiKey.createdAt)}`}</span>
        <span>{lastUsed(apiKey)}</span>
      </span>
    </div>
    @if (confirming) {
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => void revoke()}
        >
          {pending ? "Revoking…" : "Yes, revoke"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          {"Cancel"}
        </Button>
      </div>
    } @else {
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => setConfirming(true)}
      >
        {"Revoke"}
      </Button>
    }
  </li>
}
