import { useState } from 'react';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';

import {
  deleteWebhook,
  redeliverWebhook,
  revealWebhookSecret,
  rotateWebhookSecret,
  sendTestWebhook,
  setWebhookEnabled,
} from '#/webhooks/functions';
import type { WebhooksData } from '#/webhooks/functions';

type Endpoint = WebhooksData['endpoints'][number];

export function WebhookEndpoints({
  endpoints,
  onChanged,
}: {
  endpoints: Endpoint[];
  onChanged: () => Promise<void>;
}) @{
  <>
    @if (endpoints.length === 0) {
      <p className="text-sm text-muted-foreground">{"No endpoints yet. Add one to start receiving events."}</p>
    }
    @if (endpoints.length > 0) {
      <ul className="flex flex-col gap-6">
        @for (const endpoint of endpoints; key endpoint.id) {
          <EndpointRow endpoint={endpoint} onChanged={onChanged} />
        }
      </ul>
    }
  </>
}

function EndpointRow({
  endpoint,
  onChanged,
}: {
  endpoint: Endpoint;
  onChanged: () => Promise<void>;
}) @{
  const [secret, setSecret] = useState<string | null>(null);
  const [rotated, setRotated] = useState(false);
  const [testQueued, setTestQueued] = useState(false);

  const reveal = async () => {
    const result = await revealWebhookSecret({ data: { id: endpoint.id } });
    setSecret(result.secret);
    setRotated(false);
  };

  const rotate = async () => {
    const result = await rotateWebhookSecret({ data: { id: endpoint.id } });
    setSecret(result.secret);
    setRotated(true);
  };

  const sendTest = async () => {
    await sendTestWebhook({ data: { id: endpoint.id } });
    setTestQueued(true);
  };

  const toggleEnabled = async () => {
    await setWebhookEnabled({ data: { id: endpoint.id, enabled: !endpoint.enabled } });
    await onChanged();
  };

  const remove = async () => {
    await deleteWebhook({ data: { id: endpoint.id } });
    await onChanged();
  };

  <li className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <span className="truncate font-mono text-sm">{endpoint.url}</span>
      <Badge variant={endpoint.enabled ? 'secondary' : 'destructive'}>
        {endpoint.enabled ? "Enabled" : "Disabled"}
      </Badge>
    </div>
    @if (!endpoint.enabled && endpoint.failureCount > 0) {
      <p className="text-xs text-destructive">{"Disabled after repeated delivery failures."}</p>
    }
    <div className="flex flex-wrap gap-1">
      @for (const event of endpoint.events; key event) {
        <Badge variant="outline">{event}</Badge>
      }
    </div>
    @if (secret !== null) {
      <div className="flex flex-col gap-1">
        <code className="w-fit rounded bg-muted px-2 py-1 text-xs break-all select-all">
          {secret}
        </code>
        @if (rotated) {
          <p className="text-xs text-muted-foreground">{"The previous secret remains valid for 24 hours."}</p>
        }
      </div>
    }
    @if (testQueued) {
      <p className="text-xs text-muted-foreground">{"Test event queued."}</p>
    }
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => void reveal()}>
        {"Reveal secret"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void rotate()}>
        {"Rotate secret"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void sendTest()}>
        {"Send test"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => void toggleEnabled()}>
        {endpoint.enabled ? "Disable" : "Enable"}
      </Button>
      <Button type="button" size="sm" variant="destructive" onClick={() => void remove()}>
        {"Delete"}
      </Button>
    </div>
  </li>
}

export function RecentDeliveries({ deliveries }: { deliveries: WebhooksData['deliveries'] }) @{
  <>
    @if (deliveries.length === 0) {
      <p className="text-sm text-muted-foreground">{"No deliveries yet. Send a test event to try an endpoint."}</p>
    }
    @if (deliveries.length > 0) {
      <ul className="flex flex-col gap-2">
        @for (const delivery of deliveries; key delivery.id) {
          <DeliveryRow delivery={delivery} />
        }
      </ul>
    }
  </>
}

function DeliveryRow({ delivery }: { delivery: WebhooksData['deliveries'][number] }) @{
  const [queued, setQueued] = useState(false);

  const redeliver = async () => {
    await redeliverWebhook({ data: { deliveryId: delivery.id } });
    setQueued(true);
  };

  <li className="flex items-baseline gap-2 text-sm">
    <span className="font-mono text-xs">{delivery.eventType}</span>
    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
      {delivery.endpointUrl}
    </span>
    <span className="text-xs text-muted-foreground">{delivery.responseStatus}</span>
    <Badge variant={delivery.status === 'success' ? 'secondary' : 'destructive'}>
      {delivery.status === 'success' ? "Delivered" : "Failed"}
    </Badge>
    @if (delivery.status !== 'success' && !queued) {
      <Button type="button" size="sm" variant="outline" onClick={() => void redeliver()}>
        {"Redeliver"}
      </Button>
    }
    @if (queued) {
      <span className="text-xs text-muted-foreground">{"Redelivery queued."}</span>
    }
  </li>
}
