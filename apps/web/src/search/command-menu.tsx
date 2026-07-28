import * as React from 'react';
import { useMemo, useState } from 'react';
import { authClient } from '@repo/auth/client';
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  useCommandFilter,
} from '@repo/ui/components/command';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { BuildingIcon, FileIcon, LogOutIcon, PlusIcon, Repeat2Icon, UserIcon } from 'lucide-react';

import { assetUrl } from '#/files/urls';
import { allDestinations, navLeaderKey, navPath } from '#/navigation';
import type { NavItem } from '#/navigation';
import { useCommandMenu } from '#/search/command-menu-context.tsrx';
import { searchQuery } from '#/search/functions';
import { useCommandMenuShortcut, useNavigationShortcuts } from '#/search/shortcuts';
import { useDebounced } from '#/search/use-debounced';
import { clearSessionContext, isPlatformAdmin } from '#/session';
import { useAppRoute } from '#/use-app-route';
import type { Entry, Group, Page } from '#/search/entries';

/** Long enough that a burst of typing is one request, short enough to feel live. */
const searchDebounce = 200;

// Hoisted so the filter it builds keeps its identity between renders.
const filterOptions = { sensitivity: 'base' } as const;

/**
 * The command menu: one Cmd+K surface for jumping between pages, running
 * account actions, and searching the organization's files and people.
 *
 * Pages are a single value rather than a stack, because every page so far is
 * reached from the root: `page` selects which groups render and what the input
 * asks for, and Escape or Backspace on an empty input returns to the root.
 *
 * Written as plain TSX rather than TSRX: the list is built from Base UI's
 * render-prop children, which the directive syntax cannot express.
 */
export function CommandMenu() {
  const { activeOrganization, memberRole, organizations, user } = useAppRoute();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { contains } = useCommandFilter(filterOptions);

  const { open, setOpen, toggle } = useCommandMenu();
  const [page, setPage] = useState<Page>('root');
  const [query, setQuery] = useState('');

  useCommandMenuShortcut(toggle);

  const destinations = allDestinations({ memberRole, isPlatformAdmin: isPlatformAdmin(user) });
  useNavigationShortcuts(destinations, open);

  // Only text the user has stopped typing reaches the server, and only from
  // the root page: the others list what they were given.
  const debounced = useDebounced(page === 'root' ? query : '', searchDebounce);
  const results = useQuery(searchQuery(activeOrganization.id, debounced)).data;

  const dismiss = () => {
    setOpen(false);
    // Reset after closing so the next Cmd+K opens a clean root page.
    setPage('root');
    setQuery('');
  };

  const openPage = (next: Page) => {
    setPage(next);
    setQuery('');
  };

  const go = (to: NavItem['to'], params?: NavItem['params']) => {
    dismiss();
    void router.navigate({ to, params });
  };

  const switchOrganization = async (organizationId: string) => {
    dismiss();
    if (organizationId === activeOrganization.id) {
      return;
    }
    await authClient.organization.setActive({ organizationId });
    clearSessionContext(queryClient);
    await router.invalidate();
  };

  const signOut = async () => {
    dismiss();
    await authClient.signOut();
    clearSessionContext(queryClient);
    await router.invalidate();
  };

  // Backspace with nothing left to delete leaves a nested page. Escape is not
  // handled here: the dialog owns it, and only refusing its close request can
  // keep the menu open (see onOpenChange below).
  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && query.length === 0 && page !== 'root') {
      event.preventDefault();
      openPage('root');
    }
  };

  const onOpenChange = (next: boolean, details: { reason: string }) => {
    if (next) {
      setOpen(true);
      return;
    }
    // On a nested page Escape steps back out rather than closing. Leaving
    // `open` true is what keeps the dialog up, since it is controlled here.
    if (details.reason === 'escape-key' && page !== 'root') {
      openPage('root');
      return;
    }
    dismiss();
  };

  // Memoised on the data alone. The entries carry closures that are new every
  // render, and handing Base UI a fresh set of item values remounts the list
  // under whatever the pointer is currently over. None of those closures read
  // `page` or `query`, so keeping an older one is safe.
  const groups = useMemo<Group[]>(() => {
    if (page === 'organizations') {
      return [
        {
          value: 'Organizations',
          items: organizations.map(
            (organization): Entry => ({
              id: `org:${organization.id}`,
              label: organization.name,
              hint: organization.id === activeOrganization.id ? 'Active' : organization.slug,
              icon: BuildingIcon,
              run: () => void switchOrganization(organization.id),
            }),
          ),
        },
      ];
    }

    const actions: Entry[] = [
      {
        id: 'action:switch-organization',
        label: 'Switch organization…',
        icon: Repeat2Icon,
        run: () => openPage('organizations'),
      },
      {
        id: 'action:new-organization',
        label: 'New organization',
        icon: PlusIcon,
        run: () => {
          dismiss();
          void router.navigate({ to: '/orgs/new' });
        },
      },
      { id: 'action:sign-out', label: 'Sign out', icon: LogOutIcon, run: () => void signOut() },
    ];

    // Static entries are matched here because the server results arrive
    // already matched, so the built-in filter is off for the whole list.
    const matches = (entry: Entry) => query.length === 0 || contains(entry.label, query);
    const hits = results ?? [];

    return [
      {
        value: 'Go to',
        items: destinations
          .map(
            (destination): Entry => ({
              id: `nav:${navPath(destination)}`,
              label: destination.label,
              icon: destination.icon,
              shortcut:
                destination.key === undefined
                  ? undefined
                  : `${navLeaderKey.toUpperCase()} ${destination.key.toUpperCase()}`,
              run: () => go(destination.to, destination.params),
            }),
          )
          .filter(matches),
      },
      { value: 'Actions', items: actions.filter(matches) },
      {
        value: 'Files',
        items: hits
          .filter((hit) => hit.kind === 'file')
          .map(
            (file): Entry => ({
              id: `file:${file.id}`,
              label: file.name,
              hint: file.contentType,
              icon: FileIcon,
              run: () => {
                dismiss();
                window.open(assetUrl(file.id), '_blank', 'noopener');
              },
            }),
          ),
      },
      {
        value: 'People',
        items: hits
          .filter((hit) => hit.kind === 'member')
          .map(
            (member): Entry => ({
              id: `member:${member.id}`,
              label: member.name,
              hint: member.email,
              icon: UserIcon,
              run: () => go('/app/organization'),
            }),
          ),
      },
    ].filter((group) => group.items.length > 0);
  }, [page, query, results, organizations, activeOrganization.id, memberRole, user.role, contains]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={'Command menu'}>
      <Command items={groups} value={query} onValueChange={setQuery}>
        <CommandInput
          placeholder={
            page === 'organizations' ? 'Switch organization…' : 'Search or jump to a page…'
          }
          onKeyDown={onInputKeyDown}
        />
        <CommandList>
          {(group: Group) => (
            <CommandGroup key={group.value} items={group.items}>
              <CommandGroupLabel>{group.value}</CommandGroupLabel>
              <CommandCollection>
                {(entry: Entry) => (
                  <CommandItem key={entry.id} value={entry} onClick={entry.run}>
                    <entry.icon />
                    <span className="truncate">{entry.label}</span>
                    {entry.hint === undefined ? null : (
                      <span className="truncate text-xs text-muted-foreground">{entry.hint}</span>
                    )}
                    {entry.shortcut === undefined ? null : (
                      <CommandShortcut>{entry.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                )}
              </CommandCollection>
            </CommandGroup>
          )}
        </CommandList>
        <CommandEmpty>{'No results found'}</CommandEmpty>
      </Command>
    </CommandDialog>
  );
}
