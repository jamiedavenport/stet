import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { Textarea } from '@repo/ui/components/textarea';

export function FieldChangeDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (note: string) => Promise<void>;
}) @{
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  let actionVariant: 'default' | 'destructive-solid' = 'default';
  if (destructive) {
    actionVariant = 'destructive-solid';
  }

  const changeOpen = (next: boolean) => {
    if (pending && !next) {
      return;
    }
    if (!next) {
      setNote('');
      setFailed(false);
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    setFailed(false);
    try {
      await onConfirm(note);
      setNote('');
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  <AlertDialog open={open} onOpenChange={changeOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <Textarea
        value={note}
        name={"migration-note"}
        maxLength={500}
        aria-label={"Migration note"}
        placeholder={"Optional note for engineering"}
        onChange={(event) => setNote(event.target.value)}
      />
      @if (failed) {
        <FieldError>{"The field was not changed. Try again."}</FieldError>
      }
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>{"Cancel"}</AlertDialogCancel>
        <Button
          type="button"
          variant={actionVariant}
          disabled={pending}
          onClick={() => void confirm()}
        >
          {confirmLabel}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
