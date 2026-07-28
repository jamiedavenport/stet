import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';

export type TwoFactorPasswordPromptProps = {
  // Enabling and regenerating confirm with the default button; disabling is
  // destructive.
  destructive: boolean;
  pending: boolean;
  error: string | null;
  onConfirm: (password: string) => void;
  onCancel: () => void;
};

// Every two-factor mutation re-authenticates with the account password.
export function TwoFactorPasswordPrompt({
  destructive,
  pending,
  error,
  onConfirm,
  onCancel,
}: TwoFactorPasswordPromptProps) @{
  const [password, setPassword] = useState('');

  <div className="flex flex-col gap-3">
    <div className="flex flex-col gap-2">
      <Label htmlFor="tfa-password">{"Confirm your password"}</Label>
      <Input
        id="tfa-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
    </div>
    @if (error) {
      <FieldError>{error}</FieldError>
    }
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        variant={destructive ? 'destructive' : 'default'}
        disabled={pending || password.length === 0}
        onClick={() => onConfirm(password)}
      >
        {pending ? "Saving…" : "Continue"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        {"Cancel"}
      </Button>
    </div>
  </div>
}
