import { canManageOrganization } from '@repo/auth/access';
import type { OrganizationRole } from '@repo/auth/access';
import { m } from '@repo/i18n/messages';
import type { LinkProps } from '@tanstack/react-router';
import {
  Building2Icon,
  HomeIcon,
  ListTodoIcon,
  NotebookPenIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
  WebhookIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  /** A message function, so it resolves against the locale at render. */
  readonly label: () => string;
  /** Typed against the route tree: renaming a route stops this compiling. */
  readonly to: LinkProps['to'];
  readonly icon: LucideIcon;
  /** Second key of this page's `G` sequence, e.g. `G` then `N` for notes. */
  readonly key: string;
};

const navItems = [
  { label: m.home, to: '/app', icon: HomeIcon, key: 'h' },
  { label: m.tasks, to: '/app/tasks', icon: ListTodoIcon, key: 't' },
  { label: m.notes, to: '/app/notes', icon: NotebookPenIcon, key: 'n' },
  { label: m.chat, to: '/app/chat', icon: SparklesIcon, key: 'c' },
  { label: m.webhooks, to: '/app/webhooks', icon: WebhookIcon, key: 'w' },
  { label: m.settings, to: '/app/settings', icon: SettingsIcon, key: 's' },
  { label: m.organization, to: '/app/organization', icon: Building2Icon, key: 'o' },
] as const satisfies readonly NavItem[];

const adminItem = {
  label: m.admin_panel,
  to: '/app/admin',
  icon: ShieldIcon,
  key: 'a',
} as const satisfies NavItem;

/** The leader key every destination shortcut starts with. */
export const navLeaderKey = 'g';

/**
 * The pages this member may open, in sidebar order. Shared by the sidebar and
 * the command menu so the two can never offer different destinations.
 *
 * Webhooks are organization configuration, so they follow the same rule as
 * the route guard and the server functions.
 */
export function navigationFor(options: {
  memberRole: OrganizationRole;
  isPlatformAdmin: boolean;
}): readonly NavItem[] {
  const items = canManageOrganization(options.memberRole)
    ? navItems
    : navItems.filter((item) => item.to !== '/app/webhooks');
  return options.isPlatformAdmin ? [...items, adminItem] : items;
}
