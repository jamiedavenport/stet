import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Separator } from '@repo/ui/components/separator';

import { CreateEndpointForm } from '#/webhooks/webhook-create-form.tsrx';
import { RecentDeliveries, WebhookEndpoints } from '#/webhooks/webhook-endpoints.tsrx';
import { useAppRoute } from '#/use-app-route';
import { webhooksQuery } from '#/webhooks/functions';

export function WebhooksPage() @{
  const { activeOrganization } = useAppRoute();
  const { data } = useSuspenseQuery(webhooksQuery(activeOrganization.id));
  const queryClient = useQueryClient();

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: webhooksQuery(activeOrganization.id).queryKey,
    });
  };

  <div className="flex w-full max-w-2xl flex-col gap-4">
    <Card>
      <CardHeader>
        <CardTitle>{"Webhooks"}</CardTitle>
        <CardDescription>
          {"Endpoints receive signed POST requests for the events they subscribe to."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CreateEndpointForm onCreated={refresh} />
        <Separator />
        <WebhookEndpoints endpoints={data.endpoints} onChanged={refresh} />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>{"Recent deliveries"}</CardTitle>
      </CardHeader>
      <CardContent>
        <RecentDeliveries deliveries={data.deliveries} />
      </CardContent>
    </Card>
  </div>
}
