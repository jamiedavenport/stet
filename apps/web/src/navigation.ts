import { canManageOrganization } from '@repo/auth/access';
import type { OrganizationRole } from '@repo/auth/access';
import type { LinkProps } from '@tanstack/react-router';
import {
  ChartBarIcon,
  BuildingsIcon,
  ClockCounterClockwiseIcon,
  DownloadSimpleIcon,
  HouseIcon,
  KeyIcon,
  GearIcon,
  ShieldIcon,
  WebhooksLogoIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { contentIcon } from '#/content/model/kind';
import type { NavContentType } from '#/content/model/kind';

export type NavItem = {
  readonly label: string;
  /** Typed against the route tree: renaming a route stops this compiling. */
  readonly to: LinkProps['to'];
  readonly params?: LinkProps['params'];
  readonly icon: Icon;
  /** Second key of this page's `G` sequence, e.g. `G` then `H` for home. */
  readonly key?: string;
};

export type NavGroup = {
  readonly id: string;
  /** Heading above the group. Unlabelled groups read as a plain divide. */
  readonly label?: string;
  readonly items: readonly NavItem[];
};

/** The leader key every destination shortcut starts with. */
export const navLeaderKey = 'g';

const home = {
  label: 'Home',
  to: '/app',
  icon: HouseIcon,
  key: 'h',
} as const satisfies NavItem;

const marketingItems = [
  { label: 'Analytics', to: '/app/analytics', icon: ChartBarIcon, key: 'a' },
  { label: 'Import', to: '/app/import', icon: DownloadSimpleIcon, key: 'i' },
] as const satisfies readonly NavItem[];

const developerItems = [
  { label: 'API keys', to: '/app/developers/keys', icon: KeyIcon, key: 'k' },
  { label: 'Webhooks', to: '/app/developers/webhooks', icon: WebhooksLogoIcon, key: 'w' },
  { label: 'Audit log', to: '/app/audit', icon: ClockCounterClockwiseIcon, key: 'l' },
] as const satisfies readonly NavItem[];

const settingsItem = {
  label: 'Settings',
  to: '/app/settings',
  icon: GearIcon,
  key: 's',
} as const satisfies NavItem;

const adminItem = {
  label: 'Admin',
  to: '/app/admin',
  icon: ShieldIcon,
  key: 'x',
} as const satisfies NavItem;

/**
 * Organization settings, offered by the switcher in the sidebar header: it is
 * the organization's own page, so it belongs with the organization it names.
 */
export const organizationItem = {
  label: 'Organization',
  to: '/app/organization',
  icon: BuildingsIcon,
  key: 'o',
} as const satisfies NavItem;

/** Every collection and map in the model, in the order the model declares them. */
function contentItems(content: readonly NavContentType[]): readonly NavItem[] {
  return content.map((type) =>
    type.kind === 'map'
      ? {
          label: type.name,
          to: '/app/m/$map' as const,
          params: { map: type.slug },
          icon: contentIcon(type.kind),
        }
      : {
          label: type.name,
          to: '/app/c/$collection' as const,
          params: { collection: type.slug },
          icon: contentIcon(type.kind),
        },
  );
}

/**
 * The groups the sidebar lists, in order. Account and organization pages are
 * deliberately absent: they hang off the header and footer menus instead, so
 * the nav itself stays about the content.
 *
 * The developer group is organization configuration, so it follows the same
 * rule as the webhook route guard and the server functions.
 */
export function sidebarNavigation(options: {
  memberRole: OrganizationRole;
  content: readonly NavContentType[];
}): readonly NavGroup[] {
  return [
    { id: 'home', items: [home] },
    { id: 'content', label: 'Content', items: contentItems(options.content) },
    { id: 'marketing', label: 'Marketing', items: marketingItems },
    ...(canManageOrganization(options.memberRole)
      ? [{ id: 'developers', label: 'Developers', items: developerItems }]
      : []),
  ];
}

/** The pages the footer's user menu offers, about this person rather than the work. */
export function accountNavigation(options: { isPlatformAdmin: boolean }): readonly NavItem[] {
  return options.isPlatformAdmin ? [settingsItem, adminItem] : [settingsItem];
}

/**
 * Every page this member may open, wherever it is reached from. The command
 * menu and the `G` shortcuts run off this, so a destination tucked into a menu
 * is still one keystroke away.
 */
export function allDestinations(options: {
  memberRole: OrganizationRole;
  isPlatformAdmin: boolean;
  content: readonly NavContentType[];
}): readonly NavItem[] {
  return [
    ...sidebarNavigation(options).flatMap((group) => group.items),
    organizationItem,
    ...accountNavigation(options),
  ];
}

/** The item's path with its route params filled in, e.g. `/app/c/posts`. */
export function navPath(item: NavItem): string {
  const path = String(item.to);
  const params: unknown = item.params;
  if (params === null || typeof params !== 'object') {
    return path;
  }
  return path.replace(/\$(\w+)/g, (segment, name: string) => {
    const value = (params as Record<string, unknown>)[name];
    return typeof value === 'string' ? value : segment;
  });
}

/**
 * Whether a destination owns the current URL. Descendants count, so an open
 * entry keeps its collection highlighted; `/app` alone would own every page,
 * so it has to match exactly.
 */
export function isCurrent(pathname: string, item: NavItem): boolean {
  const path = navPath(item);
  if (path === '/app') {
    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
