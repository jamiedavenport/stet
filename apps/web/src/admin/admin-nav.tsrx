import { m } from '@repo/i18n/messages';
import { Link } from '@tanstack/react-router';

const tabs = [
  { label: m.overview, to: '/app/admin', exact: true },
  { label: m.users, to: '/app/admin/users', exact: false },
  { label: m.organizations, to: '/app/admin/organizations', exact: false },
] as const;

export function AdminNav() @{
  <nav className="flex gap-1 border-b pb-2">
    @for (const tab of tabs; key tab.to) {
      <Link
        to={tab.to}
        activeOptions={{ exact: tab.exact }}
        className="rounded-lg px-2.5 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        activeProps={{ className: 'bg-muted text-foreground' }}
      >
        {tab.label()}
      </Link>
    }
  </nav>
}
