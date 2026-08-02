import { useState } from 'react';
import type { ModelKit } from '@repo/content/kit-schema';
import { modelKitSchema } from '@repo/content/kit-schema';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { Field, FieldLabel } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { PageShell } from '#/components/page-shell';
import { useAppForm } from '#/form';
import { createOrganization } from '#/organization/model-kit-functions';
import { clearSessionContext, requireSession } from '#/session';

const maxKitBytes = 1024 * 1024;

export const Route = createFileRoute('/orgs/new')({
  beforeLoad: ({ context, location }) => {
    requireSession(context.session, location);
  },
  component: NewOrganization,
});

function NewOrganization() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const [kit, setKit] = useState<ModelKit | null>(null);
  const [kitError, setKitError] = useState<string | null>(null);
  const [kitFileName, setKitFileName] = useState<string | null>(null);

  const newOrgSchema = z.object({
    name: z.string().min(1, 'Enter an organization name'),
  });

  const form = useAppForm({
    defaultValues: { name: '' },
    validators: { onSubmit: newOrgSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      if (kitError !== null) {
        return;
      }
      try {
        await createOrganization({ data: { name: value.name, kit } });
        clearSessionContext(queryClient);
        await navigate({ to: '/app' });
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Unable to create organization');
      }
    },
  });

  const readKit = async (file: File | undefined) => {
    setKit(null);
    setKitError(null);
    setKitFileName(file?.name ?? null);
    if (file === undefined) {
      return;
    }
    if (file.size > maxKitBytes) {
      setKitError('That model kit is larger than 1 MB.');
      return;
    }
    try {
      const parsed = modelKitSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) {
        setKitError(parsed.error.issues[0]?.message ?? 'That file is not a valid model kit.');
        return;
      }
      setKit(parsed.data);
    } catch {
      setKitError('That file is not valid JSON.');
    }
  };

  const kitSummary =
    kit === null
      ? null
      : {
          collections: kit.types.filter((type) => type.kind === 'collection').length,
          maps: kit.types.filter((type) => type.kind === 'map').length,
          fields: kit.types.reduce((total, type) => total + type.fields.length, 0),
        };

  return (
    <PageShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-balance">{'Create an organization'}</CardTitle>
          <CardDescription className="text-pretty">
            {"Organizations keep your team's work in one place."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField name="name">
                {(field) => <field.TextField label={'Name'} placeholder="Acme Inc" />}
              </form.AppField>
              <Field data-invalid={kitError !== null}>
                <FieldLabel htmlFor="model-kit">{'Model kit (optional)'}</FieldLabel>
                <Input
                  id="model-kit"
                  name="model-kit"
                  type="file"
                  accept=".json,.stet-kit.json,application/json"
                  aria-invalid={kitError !== null}
                  onChange={(event) => void readKit(event.target.files?.[0])}
                />
                <p className="text-base text-pretty text-muted-foreground sm:text-sm">
                  {
                    'Start with collections, maps, fields, options, and references exported from another organization.'
                  }
                </p>
                {kitSummary ? (
                  <div className="rounded-lg bg-muted/60 p-3 text-base sm:text-sm">
                    <p className="min-w-0 truncate font-medium">{kitFileName}</p>
                    <p className="text-pretty text-muted-foreground">
                      {`${kitSummary.collections} collections, ${kitSummary.maps} maps, and ${kitSummary.fields} fields. No entries will be copied.`}
                    </p>
                  </div>
                ) : null}
                {kitError ? <FieldError>{kitError}</FieldError> : null}
              </Field>
              {formError ? <FieldError>{formError}</FieldError> : null}
              <form.AppForm>
                <form.SubmitButton
                  label={'Create organization'}
                  pendingLabel={'Creating…'}
                  disabled={kitError !== null}
                />
              </form.AppForm>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
