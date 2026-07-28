import { Button } from '@repo/ui/components/button';

export function BackupCodeList({ codes }: { codes: string[] }) @{
  <ul className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-3 font-mono text-sm">
    @for (const backupCode of codes; key backupCode) {
      <li>{backupCode}</li>
    }
  </ul>
}

// Shown once right after enrolment or regeneration; the codes are never
// retrievable again, so the user must save them before dismissing.
export function TwoFactorBackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) @{
  <div className="flex flex-col gap-3">
    <p className="text-sm">{"Save these backup codes somewhere safe. Each can be used once."}</p>
    <BackupCodeList codes={codes} />
    <Button type="button" variant="outline" size="sm" onClick={onDone}>
      {"Done"}
    </Button>
  </div>
}
