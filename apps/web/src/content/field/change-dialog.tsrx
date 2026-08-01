import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/alert-dialog';
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
  let actionVariant: 'default' | 'destructive-solid' = 'default';
  if (destructive) {
    actionVariant = 'destructive-solid';
  }

  const confirm = async () => {
    await onConfirm(note);
    setNote('');
  };

  <AlertDialog open={open} onOpenChange={onOpenChange}>
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
      <AlertDialogFooter>
        <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
        <AlertDialogAction variant={actionVariant} onClick={() => void confirm()}>
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
