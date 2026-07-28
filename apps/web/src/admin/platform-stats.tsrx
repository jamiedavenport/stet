import { getLocale } from '@repo/i18n';
import { m } from '@repo/i18n/messages';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { useSuspenseQuery } from '@tanstack/react-query';

import { platformStatsQuery } from '#/admin/functions';

export function PlatformStats() @{
  const { data } = useSuspenseQuery(platformStatsQuery);

  const cards = [
    { key: 'users', label: m.total_users(), value: data.users, hint: null },
    {
      key: 'new-users',
      label: m.new_users(),
      value: data.newUsers,
      hint: m.in_the_last_days({ days: data.windowDays }),
    },
    { key: 'organizations', label: m.organizations(), value: data.organizations, hint: null },
    {
      key: 'active-organizations',
      label: m.active_organizations(),
      value: data.activeOrganizations,
      hint: m.with_a_sign_in_in_the_last_days({ days: data.windowDays }),
    },
  ];

  <div className="grid gap-4 sm:grid-cols-2">
    @for (const card of cards; key card.key) {
      <Card>
        <CardHeader>
          <CardDescription>{card.label}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {card.value.toLocaleString(getLocale())}
          </CardTitle>
        </CardHeader>
        @if (card.hint !== null) {
          <CardContent>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        }
      </Card>
    }
  </div>
}
