import { useState } from 'react';
import { m } from '@repo/i18n/messages';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { renderSVG } from 'uqr';

import { BackupCodeList } from '#/account/two-factor-backup-codes.tsrx';

export type TwoFactorEnrollProps = {
  totpURI: string;
  backupCodes: string[];
  pending: boolean;
  error: string | null;
  onVerify: (code: string) => void;
  onCancel: () => void;
};

// Step two of enabling: scan the QR code, then confirm one code from the
// authenticator so a failed scan never locks the user out.
export function TwoFactorEnroll({
  totpURI,
  backupCodes,
  pending,
  error,
  onVerify,
  onCancel,
}: TwoFactorEnrollProps) @{
  const [code, setCode] = useState('');

  <div className="flex flex-col gap-4">
    <p className="text-sm">{m.scan_this_qr_code_with_your()}</p>
    <div
      className="size-40 rounded-lg bg-white p-2 [&_svg]:size-full"
      dangerouslySetInnerHTML={{ __html: renderSVG(totpURI) }}
    />
    <div className="flex flex-col gap-2">
      <Label htmlFor="totp-code">{m.authentication_code()}</Label>
      <Input
        id="totp-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
    </div>
    <p className="text-xs text-muted-foreground">{m.save_these_backup_codes()}</p>
    <BackupCodeList codes={backupCodes} />
    @if (error) {
      <FieldError>{error}</FieldError>
    }
    <div className="flex gap-2">
      <Button type="button" size="sm" disabled={pending} onClick={() => onVerify(code)}>
        {pending ? m.saving() : m.verify_and_finish()}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        {m.cancel()}
      </Button>
    </div>
  </div>
}
