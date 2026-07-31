import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/card';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { PageHeader } from '#/components/page-header.tsrx';
import { DeprecatedFieldRow } from '#/developers/deprecated-field.tsrx';
import { deprecationsQuery } from '#/developers/deprecations';
import { useAppRoute } from '#/use-app-route';

/**
 * Where a deleted field is finally let go. Deletion alone is safe by design:
 * the key stays in the generated client as a deprecation and entries go on
 * returning the last value it held, so a site keeps rendering while its
 * developers migrate. Purging is the deliberate end of that, which is why it
 * lives here rather than beside the delete that started it.
 */
export function DangerZone() @{
  useBreadcrumbs([{ label: 'Danger zone' }]);
  const { activeOrganization } = useAppRoute();
  const { data } = useSuspenseQuery(deprecationsQuery(activeOrganization.id));
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: deprecationsQuery(activeOrganization.id).queryKey,
    });
  };

  <div className="flex w-full max-w-2xl flex-col gap-6">
    <PageHeader
      title={"Danger zone"}
      description={"A deleted field keeps its key and its values so nothing breaks while you migrate. Purging one erases both, everywhere, and cannot be undone."}
    />
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{"Deleted fields"}</CardTitle>
      </CardHeader>
      <CardContent>
        @if (data.length === 0) {
          <p className="text-sm text-muted-foreground">{"Nothing to purge. Fields deleted from the content model wait here until someone erases them."}</p>
        } @else {
          <ul className="flex flex-col divide-y">
            @for (const field of data; key field.id) {
              <DeprecatedFieldRow field={field} onPurged={refresh} />
            }
          </ul>
        }
      </CardContent>
    </Card>
  </div>
}
