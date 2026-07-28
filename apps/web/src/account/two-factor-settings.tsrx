import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { m } from '@repo/i18n/messages';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@repo/ui/components/button';
import { useRouter } from '@tanstack/react-router';

import { accountsQuery, hasPassword, sessionsQuery } from '#/account/functions';
import { TwoFactorBackupCodes } from '#/account/two-factor-backup-codes.tsrx';
import { TwoFactorEnroll } from '#/account/two-factor-enroll.tsrx';
import { TwoFactorPasswordPrompt } from '#/account/two-factor-password-prompt.tsrx';
import { clearSessionContext } from '#/session';
import { useAppRoute } from '#/use-app-route';

type Setup = { totpURI: string; backupCodes: string[] };
type Mode = 'idle' | 'enable' | 'disable' | 'regenerate';
type View = 'codes' | 'setup' | 'prompt' | 'idle';

// TOTP enrolment and management. Enabling is two steps (Better Auth only flips
// twoFactorEnabled once the first code verifies), so a failed scan never locks
// the user out. The views live in the two-factor-*.tsrx files; this component
// owns the state machine and the auth calls.
export function TwoFactorSettings() @{
  const { user } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: accounts } = useQuery(accountsQuery);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = user.twoFactorEnabled === true;
  // Better Auth requires the account password to enrol, so social-only users
  // must set one first (the password card sits directly above this one).
  const needsPassword = accounts !== undefined && !hasPassword(accounts);

  const reset = () => {
    setSetup(null);
    setMode('idle');
    setError(null);
  };

  const refresh = async () => {
    clearSessionContext(queryClient);
    // Enabling or disabling rotates the session, so the active-sessions
    // card's list is stale until refetched.
    await queryClient.invalidateQueries({ queryKey: sessionsQuery.queryKey });
    await router.invalidate();
  };

  const startEnable = async (password: string) => {
    setPending(true);
    setError(null);
    const { data, error: enableError } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (enableError || data === null) {
      setError(enableError?.message ?? m.something_went_wrong_try_again());
      return;
    }
    setError(null);
    setSetup({ totpURI: data.totpURI, backupCodes: data.backupCodes });
  };

  const finishEnable = async (code: string) => {
    setPending(true);
    setError(null);
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setPending(false);
    if (verifyError) {
      setError(verifyError.message ?? m.unable_to_verify_this_code());
      return;
    }
    setBackupCodes(setup?.backupCodes ?? null);
    reset();
    await refresh();
  };

  const disable = async (password: string) => {
    setPending(true);
    setError(null);
    const { error: disableError } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (disableError) {
      setError(disableError.message ?? m.something_went_wrong_try_again());
      return;
    }
    setBackupCodes(null);
    reset();
    await refresh();
  };

  const regenerate = async (password: string) => {
    setPending(true);
    setError(null);
    const { data, error: genError } = await authClient.twoFactor.generateBackupCodes({ password });
    setPending(false);
    if (genError || data === null) {
      setError(genError?.message ?? m.something_went_wrong_try_again());
      return;
    }
    setBackupCodes(data.backupCodes);
    reset();
  };

  let view: View;
  if (backupCodes !== null && mode === 'idle' && setup === null) {
    view = 'codes';
  } else if (setup !== null) {
    view = 'setup';
  } else if (mode !== 'idle') {
    view = 'prompt';
  } else {
    view = 'idle';
  }

  let onConfirm: (password: string) => Promise<void>;
  if (mode === 'enable') {
    onConfirm = startEnable;
  } else if (mode === 'disable') {
    onConfirm = disable;
  } else {
    onConfirm = regenerate;
  }

  <>
    @switch (view) {
      @case 'codes': {
        <TwoFactorBackupCodes codes={backupCodes ?? []} onDone={() => setBackupCodes(null)} />
      }
      @case 'setup': {
        <TwoFactorEnroll
          totpURI={setup?.totpURI ?? ''}
          backupCodes={setup?.backupCodes ?? []}
          pending={pending}
          error={error}
          onVerify={(code) => void finishEnable(code)}
          onCancel={reset}
        />
      }
      @case 'prompt': {
        <TwoFactorPasswordPrompt
          destructive={mode === 'disable'}
          pending={pending}
          error={error}
          onConfirm={(password) => void onConfirm(password)}
          onCancel={reset}
        />
      }
      @default: {
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {enabled ? m.two_factor_is_on() : m.two_factor_is_off()}
          </p>
          @if (enabled) {
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMode('regenerate')}
              >
                {m.regenerate_backup_codes()}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setMode('disable')}>
                {m.turn_off()}
              </Button>
            </div>
          } @else {
            @if (needsPassword) {
              <p className="text-sm text-muted-foreground">
                {m.set_a_password_before_two_factor()}
              </p>
            } @else {
              <div>
                <Button type="button" size="sm" onClick={() => setMode('enable')}>
                  {m.set_up_two_factor()}
                </Button>
              </div>
            }
          }
        </div>
      }
    }
  </>
}
