import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon } from '@phosphor-icons/react';

import { referenceCandidatesQuery } from '#/content/cells/functions';

type ReferenceEditorProps = {
  organizationId: string;
  /** The collection whose entries this field points at. */
  targetTypeId: string;
  /** Entry ids currently held, one for a reference, many for a multi-reference. */
  value: string[];
  multiple: boolean;
  /** Titles for the held ids, so a picked entry stays labelled while searching. */
  titles: Record<string, string>;
  onPick: (entryId: string) => void;
  onClear: () => void;
};

/**
 * Entry picker for reference cells. Candidates come from the target
 * collection, most recently updated first, narrowed by a title search: a
 * collection can hold thousands of entries, so the list is always a query
 * rather than everything.
 */
export function ReferenceEditor(props: ReferenceEditorProps) @{
  const [search, setSearch] = useState('');
  const candidates = useQuery(
    referenceCandidatesQuery(props.organizationId, props.targetTypeId, search),
  );
  const held = new Set(props.value);
  const rows = candidates.data ?? [];
  // Held entries the current page or search does not contain still need a way
  // off the field, so they are listed under it.
  const missing = props.value.filter((id) => !rows.some((row) => row.id === id));

  <div className="flex flex-col gap-1">
    <Input
      autoFocus
      value={search}
      placeholder={"Search entries…"}
      aria-label={"Search entries"}
      onChange={(event) => setSearch(event.target.value)}
    />
    @if (candidates.isPending) {
      <p className="px-2 py-1 text-sm text-muted-foreground">{"Loading…"}</p>
    }
    @for (const row of rows; key row.id) {
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
        onClick={() => props.onPick(row.id)}
      >
        <span className="flex-1 truncate">{row.title}</span>
        @if (held.has(row.id)) {
          <CheckIcon className="size-3.5 text-muted-foreground" />
        }
      </button>
    } @empty {
      @if (!candidates.isPending) {
        <p className="px-2 py-1 text-sm text-muted-foreground">
          {search.trim() === '' ? "This collection has no entries yet." : "No matches."}
        </p>
      }
    }
    @for (const id of missing; key id) {
      <button
        type="button"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
        onClick={() => props.onPick(id)}
      >
        <span className="flex-1 truncate">{props.titles[id] ?? "Deleted entry"}</span>
        <CheckIcon className="size-3.5 text-muted-foreground" />
      </button>
    }
    @if (props.value.length > 0 && !props.multiple) {
      <Button variant="ghost" size="sm" className="justify-start" onClick={props.onClear}>
        {"Clear"}
      </Button>
    }
  </div>
}
