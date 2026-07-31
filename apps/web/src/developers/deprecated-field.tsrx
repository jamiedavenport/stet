import { useState } from 'react';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { fieldTypeLabels } from '@repo/content/schema';

import type { DeprecationsData } from '#/developers/deprecations';
import { purgeDeprecatedField } from '#/developers/deprecations';

type DeprecatedField = DeprecationsData[number];

// Fixed rather than the viewer's locale: the server renders this too, and a
// locale it cannot know would differ from what the browser then hydrates.
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

/** `Deleted 12 Mar 2026 by Ada Lovelace`, matching the note in the client. */
function deletionLine(field: DeprecatedField): string {
  const when = dateFormat.format(new Date(field.deletedAt));
  return field.deletedBy === null ? `Deleted ${when}` : `Deleted ${when} by ${field.deletedBy}`;
}

/** What purging this one would take with it. */
function dataLine(field: DeprecatedField): string {
  if (field.entriesWithValue === null) {
    return 'Bodies are kept in every entry that has one.';
  }
  if (field.entriesWithValue === 0) {
    return 'No entry carries a value for it.';
  }
  if (field.entriesWithValue === 1) {
    return '1 entry still returns its last value.';
  }
  return `${field.entriesWithValue} entries still return their last value.`;
}

export function DeprecatedFieldRow({
  field,
  onPurged,
}: {
  field: DeprecatedField;
  onPurged: () => Promise<void>;
}) @{
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  // The server reports the failure itself, so all this has to do is say the
  // key is still there rather than leave the row looking purged.
  const purge = async () => {
    setPending(true);
    setFailed(false);
    try {
      await purgeDeprecatedField({ data: { id: field.id } });
      await onPurged();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
      setConfirming(false);
    }
  };

  <li className="flex flex-col gap-2 py-4">
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="font-medium">{field.name}</span>
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{field.key}</code>
      <Badge variant="outline">{fieldTypeLabels[field.type]}</Badge>
      <span className="text-xs text-muted-foreground">{field.typeName}</span>
    </div>
    <p className="text-xs text-muted-foreground">
      {`${deletionLine(field)}. ${dataLine(field)}`}
    </p>
    @if (confirming) {
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-xs text-destructive">
          {"Erases the key and its values from every entry, revision, and regenerated client. Code still reading it stops compiling."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => void purge()}
        >
          {pending ? "Working…" : "Yes, purge"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          {"Cancel"}
        </Button>
      </div>
    } @else {
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
          {"Purge"}
        </Button>
        @if (failed) {
          <FieldError>{"Nothing was erased. Try again."}</FieldError>
        }
      </div>
    }
  </li>
}
