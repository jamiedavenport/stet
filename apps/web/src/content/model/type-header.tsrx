import type { ReactNode } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Label } from '@repo/ui/components/label';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { SettingsIcon } from 'lucide-react';

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

/** A collection or map page's header: rename in place, settings for the rest. */
export function TypeHeader(props: TypeHeaderProps) @{
  const { type, entryCount } = props;
  const noun = type.kind === 'map' ? 'map' : 'collection';

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

  <div className="flex w-full items-start gap-3">
    <div className="flex flex-1 flex-col gap-1">
      <Input
        key={`name-${type.name}`}
        defaultValue={type.name}
        aria-label={type.kind === 'map' ? 'Map name' : 'Collection name'}
        className="h-auto border-none px-0 text-lg font-semibold tracking-tight shadow-none focus-visible:ring-0 dark:bg-transparent"
        onBlur={(event) => void rename(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      <p className="text-sm text-muted-foreground">
        {entryCount === null
          ? 'Map · '
          : `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} · `}
        <code>{type.slug}</code>
      </p>
    </div>
    <div className="flex items-center gap-2">
      {props.children}
      <Popover>
        <PopoverTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`${type.name} settings`} />}
        >
          <SettingsIcon className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-64 flex-col gap-3 p-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`slug-${type.id}`}>{"Slug"}</Label>
            <Input
              id={`slug-${type.id}`}
              key={`slug-${type.slug}`}
              defaultValue={type.slug}
              className="h-7 font-mono text-xs"
              onBlur={(event) => void reslug(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {"The API path and generated client are named after it."}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => void remove()}>
            {type.kind === 'map' ? "Delete map" : "Delete collection and entries"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  </div>
}
