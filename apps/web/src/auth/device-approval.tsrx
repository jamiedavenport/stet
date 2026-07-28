import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { getRouteApi } from '@tanstack/react-router';

const route = getRouteApi('/device');

type Outcome = 'pending' | 'approved' | 'denied';

export function DeviceApproval() @{
  // From the CLI's verification link: `?user_code=…` prefills the code.
  const { user_code } = route.useSearch();
  const [code, setCode] = useState(user_code ?? '');
  const [outcome, setOutcome] = useState<Outcome>('pending');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = async (decision: 'approve' | 'deny') => {
    setError(null);
    setBusy(true);
    const userCode = code.trim().toUpperCase();
    // Fetching the code claims it for the current user, which the
    // approve/deny endpoints require.
    const { data, error: verifyError } = await authClient.device({
      query: { user_code: userCode },
    });
    if (verifyError || !data) {
      setBusy(false);
      setError(verifyError?.error_description ?? "Unable to verify this code");
      return;
    }
    if (data.status !== 'pending') {
      setBusy(false);
      setError("This code has already been used. Start a new login from your device.");
      return;
    }
    if (decision === 'approve') {
      const { error: approveError } = await authClient.device.approve({ userCode });
      setBusy(false);
      if (approveError) {
        setError(approveError.error_description ?? "Unable to approve this device");
        return;
      }
      setOutcome('approved');
    } else {
      const { error: denyError } = await authClient.device.deny({ userCode });
      setBusy(false);
      if (denyError) {
        setError(denyError.error_description ?? "Unable to deny this device");
        return;
      }
      setOutcome('denied');
    }
  };

  <Card>
    @switch (outcome) {
      @case 'approved': {
        <CardHeader>
          <CardTitle className="text-balance">{"Device connected"}</CardTitle>
          <CardDescription className="text-pretty">
            {"You can close this tab and return to your terminal."}
          </CardDescription>
        </CardHeader>
      }
      @case 'denied': {
        <CardHeader>
          <CardTitle className="text-balance">{"Request denied"}</CardTitle>
          <CardDescription className="text-pretty">
            {"The device was not connected. You can close this tab."}
          </CardDescription>
        </CardHeader>
      }
      @default: {
        <>
          <CardHeader>
            <CardTitle className="text-balance">{"Device authorization"}</CardTitle>
            <CardDescription className="text-pretty">
              {"A device is asking to access your account. Check that the code below matches the one shown on the device."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="flex flex-col gap-2">
                <Label htmlFor="user-code">{"Device code"}</Label>
                <Input
                  id="user-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  autoComplete="off"
                  spellCheck={false}
                  className="text-center font-mono text-lg tracking-widest uppercase"
                />
              </div>
              @if (error) {
                <FieldError>{error}</FieldError>
              }
              <div className="flex flex-col gap-2">
                <Button onClick={() => void decide('approve')} disabled={busy || !code.trim()}>
                  {busy ? "Working…" : "Approve"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void decide('deny')}
                  disabled={busy || !code.trim()}
                >
                  {"Deny"}
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </>
      }
    }
  </Card>
}
