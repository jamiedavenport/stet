import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { m } from '@repo/i18n/messages';
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
      setError(verifyError?.error_description ?? m.unable_to_verify_this_code());
      return;
    }
    if (data.status !== 'pending') {
      setBusy(false);
      setError(m.this_code_has_already_been_used());
      return;
    }
    if (decision === 'approve') {
      const { error: approveError } = await authClient.device.approve({ userCode });
      setBusy(false);
      if (approveError) {
        setError(approveError.error_description ?? m.unable_to_approve_this_device());
        return;
      }
      setOutcome('approved');
    } else {
      const { error: denyError } = await authClient.device.deny({ userCode });
      setBusy(false);
      if (denyError) {
        setError(denyError.error_description ?? m.unable_to_deny_this_device());
        return;
      }
      setOutcome('denied');
    }
  };

  <Card>
    @switch (outcome) {
      @case 'approved': {
        <CardHeader>
          <CardTitle className="text-balance">{m.device_connected()}</CardTitle>
          <CardDescription className="text-pretty">
            {m.you_can_close_this_tab_and()}
          </CardDescription>
        </CardHeader>
      }
      @case 'denied': {
        <CardHeader>
          <CardTitle className="text-balance">{m.request_denied()}</CardTitle>
          <CardDescription className="text-pretty">
            {m.the_device_was_not_connected_you()}
          </CardDescription>
        </CardHeader>
      }
      @default: {
        <>
          <CardHeader>
            <CardTitle className="text-balance">{m.device_authorization()}</CardTitle>
            <CardDescription className="text-pretty">
              {m.a_device_is_asking_to_access()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="flex flex-col gap-2">
                <Label htmlFor="user-code">{m.device_code()}</Label>
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
                  {busy ? m.working() : m.approve()}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void decide('deny')}
                  disabled={busy || !code.trim()}
                >
                  {m.deny()}
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </>
      }
    }
  </Card>
}
