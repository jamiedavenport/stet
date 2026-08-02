import { applyModelKit, exportModelKit as exportKit } from '@repo/content/kits';
import { modelKitSchema } from '@repo/content/kit-schema';
import { database, eq, schema } from '@repo/db';
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { auth } from '#/auth-server';
import { appActor } from '#/content/actor';
import { authenticatedMiddleware, organizationAdminMiddleware } from '#/session';

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(80),
  kit: modelKitSchema.nullable(),
});

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'org'
  );
}

async function createWithUniqueSlug(name: string, headers: Headers) {
  const base = slugify(name);
  let slug = base;
  const db = await database();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const existing = await db.query.organization.findFirst({
      where: eq(schema.organization.slug, slug),
      columns: { id: true },
    });
    if (existing !== undefined) {
      slug = `${base}-${crypto.randomUUID().slice(0, 4)}`;
      continue;
    }
    try {
      return await auth.api.createOrganization({
        headers,
        body: { name, slug, keepCurrentActiveOrganization: true },
      });
    } catch (error) {
      const collision = await db.query.organization.findFirst({
        where: eq(schema.organization.slug, slug),
        columns: { id: true },
      });
      if (collision === undefined || attempt === 2) {
        throw error;
      }
      slug = `${base}-${crypto.randomUUID().slice(0, 4)}`;
    }
  }
  throw new Error('Unable to choose an organization slug');
}

export const createOrganization = createServerFn({ method: 'POST' })
  .middleware([authenticatedMiddleware])
  .validator(createOrganizationSchema)
  .handler(async ({ data, context }) => {
    const organization = await createWithUniqueSlug(data.name, context.headers);
    try {
      if (data.kit !== null) {
        await applyModelKit(organization.id, data.kit, appActor(context.session.user.id));
      }
    } catch (error) {
      try {
        await auth.api.deleteOrganization({
          headers: context.headers,
          body: { organizationId: organization.id },
        });
      } catch {
        // The original import error is actionable; cleanup is best-effort.
      }
      throw error;
    }
    await auth.api.setActiveOrganization({
      headers: context.headers,
      body: { organizationId: organization.id },
    });
    return { id: organization.id };
  });

export const exportModelKit = createServerFn({ method: 'GET' })
  .middleware([organizationAdminMiddleware])
  .handler(async ({ context }) => exportKit(context.organizationId));
