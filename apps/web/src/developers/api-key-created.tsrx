import { useState } from 'react';
import { Button } from '@repo/ui/components/button';

// Shown once, right after minting. Only the hash is stored, so dismissing this
// is the last chance to read the key.
export function ApiKeyCreated({ apiKey, onDone }: { apiKey: string; onDone: () => void }) @{
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
  };

  <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3">
    <p className="text-sm">{"Copy this key now. It is stored hashed, so it cannot be shown again."}</p>
    <code
      data-testid="new-api-key"
      className="rounded-md bg-background px-2 py-1 font-mono text-xs break-all select-all"
    >
      {apiKey}
    </code>
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy key"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone}>
        {"Done"}
      </Button>
    </div>
  </div>
}
