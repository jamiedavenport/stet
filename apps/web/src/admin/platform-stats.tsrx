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
    { key: 'users', label: "Total users", value: data.users, hint: null },
    {
      key: 'new-users',
      label: "New users",
      value: data.newUsers,
      hint: `In the last ${data.windowDays} days`,
    },
    { key: 'organizations', label: "Organizations", value: data.organizations, hint: null },
    {
      key: 'active-organizations',
      label: "Active organizations",
      value: data.activeOrganizations,
      hint: `With a sign-in in the last ${data.windowDays} days`,
    },
  ];

  <div className="grid gap-4 sm:grid-cols-2">
    @for (const card of cards; key card.key) {
      <Card>
        <CardHeader>
          <CardDescription>{card.label}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {card.value.toLocaleString('en-GB')}
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
