import { getLocale } from '@repo/i18n';
import { m } from '@repo/i18n/messages';
import { Badge } from '@repo/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { useQuery } from '@tanstack/react-query';

import { AdminPagination, AdminSearchForm } from '#/admin/admin-list-controls.tsrx';
import { adminOrganizationsQuery } from '#/admin/functions';
import { useAdminList } from '#/admin/use-admin-list';

export function AdminOrganizations() @{
  const list = useAdminList();
  const { data } = useQuery(adminOrganizationsQuery({ search: list.search, page: list.page }));

  const organizations = data?.organizations ?? [];

  <Card>
    <CardHeader>
      <CardTitle>{m.organizations()}</CardTitle>
      <CardDescription>{m.every_organization_on_the_platform()}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <AdminSearchForm label={m.search_by_name()} list={list} />
      @if (organizations.length === 0) {
        <p className="text-sm text-muted-foreground">{m.no_organizations_found()}</p>
      }
      @if (organizations.length > 0) {
        <ul className="flex flex-col gap-3">
          @for (const organization of organizations; key organization.id) {
            <li className="flex flex-wrap items-baseline gap-2 border-b pb-3 text-sm last:border-b-0">
              <span className="font-medium">{organization.name}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {organization.slug}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.member_count({ members: organization.members })}
              </span>
              <span className="text-xs text-muted-foreground">
                {organization.createdAt.toLocaleDateString(getLocale())}
              </span>
              <Badge variant={organization.plan === 'paid' ? 'default' : 'outline'}>
                {organization.plan === 'paid' ? m.paid() : m.free()}
              </Badge>
            </li>
          }
        </ul>
      }
      @if (organizations.length > 0) {
        <AdminPagination list={list} total={data?.total ?? 0} shown={organizations.length} />
      }
    </CardContent>
  </Card>
}
