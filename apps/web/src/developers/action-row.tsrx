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
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(agentPrompt(action));
    setCopied(true);
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

  <li className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0">
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-base font-medium sm:text-sm">{action.name}</span>
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{action.key}</code>
      <Badge variant="outline">{action.kind === 'renamed' ? "Renamed" : "Deleted"}</Badge>
      <span className="text-xs text-muted-foreground">{action.typeName}</span>
    </div>
    @if (action.kind === 'renamed' && action.canonicalKey !== null) {
      <p className="text-base text-pretty text-muted-foreground sm:text-sm">
        {"Use "}<code>{action.canonicalKey}</code>{" instead. The old key still returns its current value."}
      </p>
    }
    @if (action.note !== null) {
      <div className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
        <p className="text-sm font-medium">{"Note from content"}</p>
        <p className="text-base text-pretty text-muted-foreground sm:text-sm">{action.note}</p>
      </div>
    }
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
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
        <FieldError>{"Nothing was removed. Try again."}</FieldError>
      }
    </div>
  </li>
}
