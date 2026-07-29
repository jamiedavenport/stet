import type { ReactNode } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { TrashIcon } from '@phosphor-icons/react';

import { deleteContentType, updateContentType } from '#/content/model/functions';

type TypeHeaderProps = {
  type: { id: string; slug: string; name: string; kind: 'collection' | 'map' };
  /** Entries in the collection; null for maps, which always hold one. */
  entryCount: number | null;
  onChanged: () => Promise<void>;
  /** The page's own URL carries the slug, so the caller must move to it. */
  onSlugChanged: (slug: string) => Promise<void>;
  onDeleted: () => Promise<void>;
  children?: ReactNode;
};

const commitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.blur();
  }
};

/** A collection or map page's header: name and slug edited in place. */
export function TypeHeader(props: TypeHeaderProps) @{
  const { type, entryCount } = props;

  const rename = async (name: string) => {
    if (name.trim().length === 0 || name.trim() === type.name) {
      return;
    }
    await updateContentType({ data: { id: type.id, name: name.trim() } });
    await props.onChanged();
  };

  const reslug = async (slug: string) => {
    if (slug.trim().length === 0 || slug.trim() === type.slug) {
      return;
    }
    const updated = await updateContentType({ data: { id: type.id, slug: slug.trim() } });
    // Move to the new URL before invalidating: the old slug no longer loads.
    await props.onSlugChanged(updated.slug);
    await props.onChanged();
  };

  const remove = async () => {
    await deleteContentType({ data: { id: type.id } });
    // Leave before invalidating: a refetch on this page would hit not-found.
    await props.onDeleted();
    await props.onChanged();
  };

  <div className="-mx-6 flex items-start gap-3 border-b px-6 pb-5">
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Input
        key={`name-${type.name}`}
        defaultValue={type.name}
        aria-label={type.kind === 'map' ? 'Map name' : 'Collection name'}
        className="h-auto border-none px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0 dark:bg-transparent"
        onBlur={(event) => void rename(event.target.value)}
        onKeyDown={commitOnEnter}
      />
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        @if (entryCount !== null) {
          <span className="tabular-nums">
            {`${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`}
          </span>
        } @else {
          <span>{"Map"}</span>
        }
        <span aria-hidden="true">{"·"}</span>
        <Input
          key={`slug-${type.slug}`}
          defaultValue={type.slug}
          aria-label={type.kind === 'map' ? 'Map slug' : 'Collection slug'}
          className="h-6 w-auto field-sizing-content min-w-16 rounded-md border-none bg-transparent px-1 font-mono text-xs shadow-none hover:bg-muted focus-visible:bg-background focus-visible:ring-1 dark:bg-transparent"
          onBlur={(event) => void reslug(event.target.value)}
          onKeyDown={commitOnEnter}
        />
      </div>
    </div>
    <div className="flex items-center gap-2">
      {props.children}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={type.kind === 'map' ? `Delete ${type.name}` : `Delete ${type.name} and entries`}
        className="text-muted-foreground hover:text-destructive"
        onClick={() => void remove()}
      >
        <TrashIcon className="size-4" />
      </Button>
    </div>
  </div>
}
