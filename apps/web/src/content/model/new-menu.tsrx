import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { SidebarMenuButton, SidebarMenuItem } from '@repo/ui/components/sidebar';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import { contentIcon } from '#/content/model/kind';
import type { ContentKind } from '#/content/model/kind';
import { contentModelQuery, createContentType } from '#/content/model/functions';
import { useAppRoute } from '#/use-app-route';

const CollectionIcon = contentIcon('collection');
const MapIcon = contentIcon('map');

/**
 * The sidebar's "New" entry: a two-option menu that creates the collection or
 * map immediately as "Untitled" and lands on its page, where the name and
 * slug are edited in place.
 */
export function NewContentMenu() @{
  const { activeOrganization } = useAppRoute();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const reset = (next: boolean) => {
    setOpen(next);
  };

  const create = async (kind: ContentKind) => {
    if (creating) {
      return;
    }
    setCreating(true);
    try {
      const created = await createContentType({ data: { name: "Untitled", kind } });
      await queryClient.invalidateQueries({
        queryKey: contentModelQuery(activeOrganization.id).queryKey,
      });
      reset(false);
      if (kind === 'map') {
        await router.navigate({ to: '/app/m/$map', params: { map: created.slug } });
      } else {
        await router.navigate({ to: '/app/c/$collection', params: { collection: created.slug } });
      }
    } finally {
      setCreating(false);
    }
  };

  <SidebarMenuItem>
    <Popover open={open} onOpenChange={reset}>
      <PopoverTrigger
        render={<SidebarMenuButton tooltip={"New"} className="text-muted-foreground" />}
      >
        <PlusIcon />
        <span>{"New"}</span>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-64 p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => create('collection')}
            >
              <CollectionIcon className="size-4 text-muted-foreground" />
              {"New collection"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => create('map')}
            >
              <MapIcon className="size-4 text-muted-foreground" />
              {"New map"}
            </Button>
          </div>
      </PopoverContent>
    </Popover>
  </SidebarMenuItem>
}
