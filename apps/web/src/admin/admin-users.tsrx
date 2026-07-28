import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AdminPagination, AdminSearchForm } from '#/admin/admin-list-controls.tsrx';
import { AdminUserRow } from '#/admin/admin-user-row.tsrx';
import { adminUsersQuery } from '#/admin/functions';
import { useAdminList } from '#/admin/use-admin-list';
import { useAppRoute } from '#/use-app-route';

export function AdminUsers() @{
  const { user } = useAppRoute();
  const list = useAdminList();
  const queryClient = useQueryClient();
  const { data } = useQuery(adminUsersQuery({ search: list.search, page: list.page }));

  const users = data?.users ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  <Card>
    <CardHeader>
      <CardTitle>{"Users"}</CardTitle>
      <CardDescription>{"Every account on the platform."}</CardDescription>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <AdminSearchForm label={"Search by email"} list={list} />
      @if (users.length === 0) {
        <p className="text-sm text-muted-foreground">{"No users found."}</p>
      }
      @if (users.length > 0) {
        <ul className="flex flex-col gap-3">
          @for (const listed of users; key listed.id) {
            <AdminUserRow user={listed} viewerId={user.id} onChanged={refresh} />
          }
        </ul>
      }
      @if (users.length > 0) {
        <AdminPagination list={list} total={data?.total ?? 0} shown={users.length} />
      }
    </CardContent>
  </Card>
}
