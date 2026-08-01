import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { FieldError } from '@repo/ui/components/field';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';

import { createEntry } from '#/content/entry/functions';
import { contentModelQuery } from '#/content/model/functions';
import { recentEntriesQuery } from '#/home/functions';
import { useCommandMenu } from '#/search/command-menu-context.tsrx';
import { useAppRoute } from '#/use-app-route';

/** How many collections get their own button before the row stops growing. */
const collectionLimit = 4;

/**
 * One-click starts: a new entry in each collection, straight into its editor,
 * plus the command menu for everything else.
 */
export function QuickActions() @{
  const { activeOrganization } = useAppRoute();
  const commandMenu = useCommandMenu();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: model } = useSuspenseQuery(contentModelQuery(activeOrganization.id));

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const collections = model.types
    .filter((type) => type.kind === 'collection')
    .slice(0, collectionLimit);

  const create = async (typeId: string, typeSlug: string) => {
    if (creating) {
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const created = await createEntry({ data: { typeId } });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: contentModelQuery(activeOrganization.id).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: recentEntriesQuery(activeOrganization.id).queryKey,
        }),
      ]);
      await router.navigate({
        to: '/app/c/$collection/$entry',
        params: { collection: typeSlug, entry: created.id },
      });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Creating the entry failed");
    } finally {
      setCreating(false);
    }
  };

  <div className="flex flex-col gap-2">
    <div role="group" aria-label="Quick actions" className="flex flex-wrap items-center gap-2">
    @for (const collection of collections; key collection.id) {
      <Button
        variant="outline"
        size="sm"
        disabled={creating}
        onClick={() => void create(collection.id, collection.slug)}
      >
        <PlusIcon aria-hidden />
        {`New in ${collection.name}`}
      </Button>
    }
    <Button
      variant="outline"
      size="sm"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => commandMenu.setOpen(true)}
    >
      <MagnifyingGlassIcon aria-hidden />
      {"Search"}
      <kbd className="pointer-events-none font-sans text-xs text-muted-foreground">{"⌘K"}</kbd>
    </Button>
    </div>
    @if (error !== null) {
      <FieldError>{error}</FieldError>
    }
  </div>
}
