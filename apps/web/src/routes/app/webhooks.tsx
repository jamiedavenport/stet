import { m } from '@repo/i18n/messages';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { canManageOrganization } from '@repo/auth/access';
import { Separator } from '@repo/ui/components/separator';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { CreateEndpointForm } from '#/webhooks/webhook-create-form.tsrx';
import { RecentDeliveries, WebhookEndpoints } from '#/webhooks/webhook-endpoints.tsrx';
import { useAppRoute } from '#/use-app-route';
import { webhooksQuery } from '#/webhooks/functions';

export const Route = createFileRoute('/app/webhooks')({
  // Mirrors the server functions' organizationAdminMiddleware: for members
  // the page does not exist. The sidebar hides the link on the same rule.
  beforeLoad: ({ context }) => {
    if (!canManageOrganization(context.memberRole)) {
      throw notFound();
    }
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(webhooksQuery(context.activeOrganization.id)),
  component: Webhooks,
});

function Webhooks() {
  const { activeOrganization } = useAppRoute();
  const { data } = useSuspenseQuery(webhooksQuery(activeOrganization.id));
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: webhooksQuery(activeOrganization.id).queryKey,
    });
  };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{m.webhooks()}</CardTitle>
          <CardDescription>{m.endpoints_receive_signed_posts()}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CreateEndpointForm onCreated={refresh} />
          <Separator />
          <WebhookEndpoints endpoints={data.endpoints} onChanged={refresh} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{m.recent_deliveries()}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentDeliveries deliveries={data.deliveries} />
        </CardContent>
      </Card>
    </div>
  );
}
