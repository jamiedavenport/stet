import { Card, CardContent } from '@repo/ui/components/card';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';

const stats = [
  { label: 'Views', hint: 'Last 30 days' },
  { label: 'Visitors', hint: 'Last 30 days' },
  { label: 'Avg. time on page', hint: 'Last 30 days' },
] as const;

const graphs = [
  { title: 'Views over time', description: 'Traffic across every entry.' },
  { title: 'Top entries', description: 'The entries readers open most.' },
] as const;

export function AnalyticsDashboard() @{
  useBreadcrumbs([{ label: 'Analytics' }]);

  <div className="flex w-full flex-col gap-6">
    <PageHeader
      title={"Analytics"}
      description={"How every entry performs, cookieless and first-party."}
    />
    <div className="@container flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-3">
        @for (const stat of stats; key stat.label) {
          <Card size="sm">
            <CardContent className="flex flex-col gap-1">
              <p className="truncate text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{"—"}</p>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        }
      </div>
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
        @for (const graph of graphs; key graph.title) {
          <Card>
            <CardContent className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">{graph.title}</h2>
              <p className="text-sm text-muted-foreground">{graph.description}</p>
            </CardContent>
            <CardContent className="flex h-56 items-center justify-center">
              <p className="max-w-xs text-center text-sm text-pretty text-muted-foreground">
                {"Data appears here once your content is served through the client."}
              </p>
            </CardContent>
          </Card>
        }
      </div>
    </div>
  </div>
}
