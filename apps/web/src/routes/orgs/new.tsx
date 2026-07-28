import { useState } from 'react';
import { authClient } from '@repo/auth/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { FieldError, FieldGroup } from '@repo/ui/components/field';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';

import { PageShell } from '#/components/page-shell';
import { useAppForm } from '#/form';
import { clearSessionContext, requireSession } from '#/session';

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createOrganization(name: string) {
  const slug = slugify(name) || 'org';
  const first = await authClient.organization.create({ name, slug });
  if (first.error?.code !== 'ORGANIZATION_SLUG_ALREADY_TAKEN') return first;
  // Slug collision with another org: retry once with a random suffix.
  return authClient.organization.create({
    name,
    slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
  });
}

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

  const newOrgSchema = z.object({
    name: z.string().min(1, 'Enter an organization name'),
  });

  const form = useAppForm({
    defaultValues: { name: '' },
    validators: { onSubmit: newOrgSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { data, error } = await createOrganization(value.name);
      if (error || !data) {
        setFormError(error?.message ?? 'Unable to create organization');
        return;
      }
      await authClient.organization.setActive({ organizationId: data.id });
      clearSessionContext(queryClient);
      await navigate({ to: '/app' });
    },
  });

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
              {formError ? <FieldError>{formError}</FieldError> : null}
              <form.AppForm>
                <form.SubmitButton label={'Create organization'} pendingLabel={'Creating…'} />
              </form.AppForm>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
