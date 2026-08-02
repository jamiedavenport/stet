import type { Actor } from '@repo/audit';
import { database, eq, schema } from '@repo/db';

import { createField } from './fields';
import type { ModelKit } from './kit-schema';
import { modelKitSchema } from './kit-schema';
import { createContentType, readContentModel } from './model';
import type { FieldConfig } from './schema';

export async function exportModelKit(organizationId: string): Promise<ModelKit> {
  const db = await database();
  const organization = await db.query.organization.findFirst({
    where: eq(schema.organization.id, organizationId),
    columns: { name: true },
  });
  if (organization === undefined) {
    throw new Error('Organization not found');
  }
  const model = await readContentModel(organizationId);
  const slugs = new Map(model.types.map((type) => [type.id, type.slug]));
  return modelKitSchema.parse({
    format: 'stet-model-kit',
    version: 1,
    name: `${organization.name} model`,
    types: model.types.map((type) => ({
      name: type.name,
      slug: type.slug,
      kind: type.kind,
      fields: type.fields.map((field) => {
        const selects = field.type === 'select' || field.type === 'multi_select';
        const options = selects
          ? (field.config.options ?? []).map(({ name, color }) => ({ name, color }))
          : undefined;
        const collection =
          field.config.typeId === undefined ? undefined : slugs.get(field.config.typeId);
        if (field.config.typeId !== undefined && collection === undefined) {
          throw new Error(
            `${type.name}.${field.name} points to a collection that no longer exists`,
          );
        }
        return {
          name: field.name,
          key: field.key,
          type: field.type,
          options,
          collection,
        };
      }),
    })),
  });
}

export async function applyModelKit(
  organizationId: string,
  input: ModelKit,
  actor: Actor,
): Promise<void> {
  const kit = modelKitSchema.parse(input);
  const db = await database();
  const existing = await db.query.contentType.findFirst({
    where: eq(schema.contentType.organizationId, organizationId),
    columns: { id: true },
  });
  if (existing !== undefined) {
    throw new Error('A model kit can only be applied to an empty organization');
  }

  const ids = new Map<string, string>();
  for (const type of kit.types) {
    const created = await createContentType(
      organizationId,
      { name: type.name, slug: type.slug, kind: type.kind },
      actor,
    );
    ids.set(type.slug, created.id);
  }

  for (const type of kit.types) {
    const typeId = requiredId(ids, type.slug);
    for (const field of type.fields) {
      const config: FieldConfig = {};
      if (field.options !== undefined) {
        config.options = field.options.map((option) => ({
          id: crypto.randomUUID(),
          name: option.name,
          color: option.color,
        }));
      }
      if (field.collection !== undefined) {
        config.typeId = requiredId(ids, field.collection);
      }
      await createField(
        organizationId,
        { typeId, name: field.name, key: field.key, type: field.type, config },
        actor,
      );
    }
  }
}

function requiredId(ids: ReadonlyMap<string, string>, slug: string): string {
  const id = ids.get(slug);
  if (id === undefined) {
    throw new Error(`Content type was not created: ${slug}`);
  }
  return id;
}
