import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { SidebarMenuButton, SidebarMenuItem } from '@repo/ui/components/sidebar';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { PlusIcon } from '@phosphor-icons/react';

import { contentIcon } from '#/content/model/kind';
import type { ContentKind } from '#/content/model/kind';
import { contentModelQuery, createContentType } from '#/content/model/functions';
import { useAppRoute } from '#/use-app-route';

const CollectionIcon = contentIcon('collection');
const MapIcon = contentIcon('map');

// Which of the two to reach for is the one thing a new editor has to be told,
// so the menu says it rather than leaving them to find out by creating one.
const options = [
  {
    kind: 'collection',
    icon: CollectionIcon,
    label: 'New collection',
    description: 'Many entries that share a shape, like blog posts or case studies.',
  },
  {
    kind: 'map',
    icon: MapIcon,
    label: 'New map',
    description: 'A single entry on its own, like a landing page or your site settings.',
  },
] as const satisfies readonly {
  kind: ContentKind;
  icon: typeof CollectionIcon;
  label: string;
  description: string;
}[];

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
      <PopoverContent side="right" align="start" className="w-76 p-2">
          <div className="flex flex-col gap-1">
            @for (const option of options; key option.kind) {
              <Button
                variant="ghost"
                size="sm"
                // The size variants are one line tall and nowrap, so a
                // description needs the height and the wrapping back.
                className="h-auto w-full items-start justify-start gap-2.5 px-2 py-2 text-left whitespace-normal"
                onClick={() => create(option.kind)}
              >
                <option.icon className="mt-0.5 size-4 text-muted-foreground" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </Button>
            }
          </div>
      </PopoverContent>
    </Popover>
  </SidebarMenuItem>
}
