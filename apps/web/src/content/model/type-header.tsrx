import type { ReactNode } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { TrashIcon } from '@phosphor-icons/react';

import { deleteContentType, updateContentType } from '#/content/model/functions';

type TypeHeaderProps = {
  type: { id: string; slug: string; name: string; kind: 'collection' | 'map' };
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
  const { type } = props;

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

  <div className="-mx-6 flex items-center gap-3 border-b px-6 pb-5">
    {/* Both sizes are set at md too: the shared Input's own md:text-sm wins
        over an unprefixed size class above that breakpoint. */}
    <Input
      key={`name-${type.name}`}
      defaultValue={type.name}
      aria-label={type.kind === 'map' ? 'Map name' : 'Collection name'}
      className="h-auto w-auto field-sizing-content min-w-24 border-none px-0 text-4xl font-semibold tracking-tight shadow-none focus-visible:ring-0 md:text-4xl dark:bg-transparent"
      onBlur={(event) => void rename(event.target.value)}
      onKeyDown={commitOnEnter}
    />
    <Input
      key={`slug-${type.slug}`}
      defaultValue={type.slug}
      aria-label={type.kind === 'map' ? 'Map slug' : 'Collection slug'}
      className="h-7 w-auto field-sizing-content min-w-16 rounded-md border-none bg-transparent px-1.5 font-mono text-sm text-muted-foreground shadow-none hover:bg-muted focus-visible:bg-background focus-visible:ring-1 md:text-sm dark:bg-transparent"
      onBlur={(event) => void reslug(event.target.value)}
      onKeyDown={commitOnEnter}
    />
    <div className="ml-auto flex items-center gap-2">
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
