import { useState } from 'react';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { z } from 'zod';

import { useAppForm } from '#/form';
import { createApiKey, maxKeyNameLength } from '#/developers/functions';

export function CreateApiKeyForm({ onCreated }: { onCreated: (key: string) => Promise<void> }) @{
  const [formError, setFormError] = useState<string | null>(null);

  const nameSchema = z.object({
    name: z
      .string()
      .min(1, "Name the key")
      .max(maxKeyNameLength, `Keep the name under ${maxKeyNameLength} characters`),
  });

  const form = useAppForm({
    defaultValues: { name: '' },
    validators: { onSubmit: nameSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      let created: { key: string };
      try {
        created = await createApiKey({ data: { name: value.name } });
      } catch {
        setFormError("Could not create the key. Try again.");
        return;
      }
      form.reset();
      await onCreated(created.key);
    },
  });

  <form
    onSubmit={(event) => {
      event.preventDefault();
      void form.handleSubmit();
    }}
  >
    <FieldGroup>
      <form.AppField name="name">
        {(field) => (
          <field.TextField
            label={"Key name"}
            placeholder="Production website"
            autoComplete="off"
            maxLength={maxKeyNameLength}
          />
        )}
      </form.AppField>
      @if (formError !== null) {
        <FieldError>{formError}</FieldError>
      }
      <form.AppForm>
        <form.SubmitButton label={"Create key"} pendingLabel={"Creating…"} />
      </form.AppForm>
    </FieldGroup>
  </form>
}
