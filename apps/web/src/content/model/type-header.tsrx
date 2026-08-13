import { type ReactNode, useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdown-menu';
import { FieldError } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { DotsThreeIcon, TrashIcon } from '@phosphor-icons/react';

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

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
    if (deletePending) {
      return;
    }
    setDeletePending(true);
    setDeleteFailed(false);
    try {
      await deleteContentType({ data: { id: type.id } });
    } catch {
      setDeletePending(false);
      setDeleteFailed(true);
      return;
    }
    setDeleteOpen(false);
    // Leave before invalidating: a refetch on this page would hit not-found.
    await props.onDeleted();
    await props.onChanged();
    setDeletePending(false);
  };

  const changeDeleteOpen = (open: boolean) => {
    if (deletePending && !open) {
      return;
    }
    if (!open) {
      setDeleteFailed(false);
    }
    setDeleteOpen(open);
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
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={type.kind === 'map' ? 'Map actions' : 'Collection actions'}
              className="relative"
            />
          }
        >
          <span
            className="pointer-fine:hidden absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2"
            aria-hidden="true"
          />
          <DotsThreeIcon className="size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <TrashIcon className="size-4 shrink-0" />
            {type.kind === 'map' ? 'Delete map' : 'Delete collection'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={changeDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {type.kind === 'map'
                ? `Delete ${type.name}?`
                : `Delete ${type.name} and all its content?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {type.kind === 'map'
                ? 'This permanently deletes the map, its fields, content, revision history, and rich text. This action cannot be undone.'
                : 'This permanently deletes the collection, its fields, every entry, all revision history, and all rich text. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          @if (deleteFailed) {
            <FieldError>
              {type.kind === 'map'
                ? 'The map was not deleted. Try again.'
                : 'The collection was not deleted. Try again.'}
            </FieldError>
          }
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>{"Cancel"}</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive-solid"
              disabled={deletePending}
              onClick={() => void remove()}
            >
              {deletePending
                ? 'Deleting…'
                : type.kind === 'map'
                  ? 'Delete map'
                  : 'Delete collection'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
}
