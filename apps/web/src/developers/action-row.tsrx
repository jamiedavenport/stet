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
  AlertDialogTrigger,
} from '@repo/ui/components/alert-dialog';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { TableCell, TableRow } from '@repo/ui/components/table';

import type { ActionsData } from '#/developers/deprecations';
import { completeAction } from '#/developers/deprecations';

type FieldAction = ActionsData[number];

function agentPrompt(action: FieldAction): string {
  const context = action.note === null ? 'No additional context was provided.' : action.note;
  if (action.kind === 'renamed') {
    return `Migrate downstream code for a Stet field rename.

Content type: ${action.typeName} (${action.typeSlug})
Deprecated key: ${action.key}
Current key: ${action.canonicalKey ?? 'unknown'}
Context from the content team: ${context}

Find every use of the deprecated key and migrate it to the current key. Do not edit the generated Stet client. Run the relevant checks and report what changed. Do not complete the Action in Stet.`;
  }
  return `Remove downstream dependencies on a deleted Stet field.

Content type: ${action.typeName} (${action.typeSlug})
Deleted key: ${action.key}
Context from the content team: ${context}

Find every use of the deleted key and remove or replace it according to the context. Do not edit the generated Stet client. Run the relevant checks and report what changed. Do not complete the Action in Stet.`;
}

function completionText(action: FieldAction, relatedKeys: string[]): string {
  if (action.kind === 'renamed') {
    return `The deprecated key "${action.key}" will disappear from the API and generated client. Code still using it will stop compiling.`;
  }
  return `This permanently erases the field, its values, rich-text bodies, revision history, and the keys ${relatedKeys.map((key) => `"${key}"`).join(', ')}. Code still using them will stop compiling.`;
}

export function ActionRow({
  action,
  relatedKeys,
  onCompleted,
}: {
  action: FieldAction;
  relatedKeys: string[];
  onCompleted: () => Promise<void>;
}) @{
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(agentPrompt(action));
      setCopied(true);
    } catch {
      setCopyFailed(true);
    }
  };

  const complete = async () => {
    setFailed(false);
    try {
      await completeAction({ data: { id: action.id } });
      await onCompleted();
    } catch {
      setFailed(true);
    }
  };

  <TableRow>
    <TableCell className="py-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{action.name}</p>
        <p className="font-mono text-sm text-muted-foreground">{action.key}</p>
      </div>
    </TableCell>
    <TableCell className="text-sm">{action.typeName}</TableCell>
    <TableCell>
      <div className="flex flex-col items-start gap-1.5">
        <Badge variant={action.kind === 'renamed' ? 'secondary' : 'destructive'}>
          {action.kind === 'renamed' ? "Renamed" : "Deleted"}
        </Badge>
        @if (action.kind === 'renamed' && action.canonicalKey !== null) {
          <p className="text-sm text-muted-foreground">
            {"Now "}<code className="font-mono">{action.canonicalKey}</code>
          </p>
        }
      </div>
    </TableCell>
    <TableCell className="max-w-xs whitespace-normal">
      <p className="text-sm text-pretty text-muted-foreground">
        {action.note ?? 'No note provided.'}
      </p>
    </TableCell>
    <TableCell className="py-3 text-right">
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? "Prompt copied" : "Copy agent prompt"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger render={<Button type="button" size="sm" variant="destructive" />}>
            {"Complete"}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{`Complete migration for ${action.key}?`}</AlertDialogTitle>
              <AlertDialogDescription>{completionText(action, relatedKeys)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
              <AlertDialogAction variant="destructive-solid" onClick={() => void complete()}>
                {"Complete migration"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        @if (failed) {
          <FieldError className="max-w-64 whitespace-normal text-right">{"Nothing was removed. Try again."}</FieldError>
        }
        @if (copyFailed) {
          <FieldError className="max-w-64 whitespace-normal text-right">{"The prompt could not be copied. Try again."}</FieldError>
        }
      </div>
    </TableCell>
  </TableRow>
}
