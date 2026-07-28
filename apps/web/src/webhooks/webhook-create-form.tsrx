import { useState } from 'react';
import { m } from '@repo/i18n/messages';
import { webhookEventTypes } from '@repo/webhooks/registry';
import type { WebhookEventType } from '@repo/webhooks/registry';
import { Button } from '@repo/ui/components/button';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { Label } from '@repo/ui/components/label';
import { z } from 'zod';

import { useAppForm } from '#/form';
import { createWebhook } from '#/webhooks/functions';

export function CreateEndpointForm({ onCreated }: { onCreated: () => Promise<void> }) @{
  const [events, setEvents] = useState<WebhookEventType[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Built in-render so m.*() resolves in the request's locale scope.
  const urlSchema = z.object({
    url: z.url(m.enter_a_valid_url()),
  });

  const form = useAppForm({
    defaultValues: { url: '' },
    validators: { onSubmit: urlSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      if (events.length === 0) {
        setFormError(m.select_at_least_one_event());
        return;
      }
      try {
        await createWebhook({ data: { url: value.url, events } });
      } catch {
        setFormError(m.webhook_urls_must_use_https());
        return;
      }
      form.reset();
      setEvents([]);
      await onCreated();
    },
  });

  const toggleEvent = (event: WebhookEventType) => {
    setEvents((current) =>
      current.includes(event) ? current.filter((entry) => entry !== event) : [...current, event],
    );
  };

  <form
    onSubmit={(event) => {
      event.preventDefault();
      void form.handleSubmit();
    }}
  >
    <FieldGroup>
      <form.AppField name="url">
        {(field) => (
          <field.TextField
            label={m.endpoint_url()}
            type="url"
            placeholder="https://example.com/webhooks"
          />
        )}
      </form.AppField>
      <div className="flex flex-col gap-2">
        <Label>{m.events()}</Label>
        <div className="flex flex-wrap gap-2">
          @for (const event of webhookEventTypes; key event) {
            <Button
              type="button"
              size="sm"
              variant={events.includes(event) ? 'default' : 'outline'}
              aria-pressed={events.includes(event)}
              onClick={() => {
                toggleEvent(event);
              }}
            >
              {event}
            </Button>
          }
        </div>
      </div>
      @if (formError !== null) {
        <FieldError>{formError}</FieldError>
      }
      <form.AppForm>
        <form.SubmitButton label={m.create_endpoint()} pendingLabel={m.creating()} />
      </form.AppForm>
    </FieldGroup>
  </form>
}
