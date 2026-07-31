/**
 * The codegen behind `@stetcms/vite` and the CLI's `stet generate`: fetch an
 * organization's content model and render the typed `stet.gen.ts` module.
 *
 * Free of relative imports on purpose: build tools load this entry under
 * plain Node, which resolves package names but not this package's own
 * extensionless paths.
 */

import { DEFAULT_ORIGIN } from '@stetcms/config';

export { DEFAULT_ORIGIN };

/** The `/api/v1/model` payload the module is generated from. */
export type ContentModel = {
  types: {
    slug: string;
    name: string;
    kind: 'collection' | 'map';
    fields: {
      key: string;
      name: string;
      type: string;
      options: { name: string }[];
      /** Slug of the collection a reference field points at. */
      collection?: string;
      /** Deleted from the model: emitted as a deprecation, never dropped. */
      deprecated?: { at: string; by?: string };
    }[];
  }[];
};

/** Fetches the content model the given API key's organization has shaped. */
export async function fetchContentModel(origin: string, apiKey: string): Promise<ContentModel> {
  const response = await fetch(`${origin}/api/v1/model`, { headers: { 'x-api-key': apiKey } });
  if (!response.ok) {
    throw new Error(`GET ${origin}/api/v1/model responded ${response.status}`);
  }
  return (await response.json()) as ContentModel;
}

/** `case-studies` → `CaseStudiesEntry`; never starts with a digit. */
export function entryTypeName(slug: string): string {
  const pascal = slug
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
  return /^[A-Za-z]/.test(pascal) ? `${pascal}Entry` : `Stet${pascal}Entry`;
}

function optionUnion(options: { name: string }[]): string {
  if (options.length === 0) {
    return 'string';
  }
  return options.map((option) => JSON.stringify(option.name)).join(' | ');
}

type ModelField = ContentModel['types'][number]['fields'][number];

function fieldTsType(field: ModelField): string {
  switch (field.type) {
    case 'number':
      return 'number';
    case 'checkbox':
      return 'boolean';
    case 'person':
      return '{ id: string; name: string }';
    case 'select':
      return optionUnion(field.options);
    case 'multi_select':
      return field.options.length === 0 ? 'string[]' : `(${optionUnion(field.options)})[]`;
    case 'asset':
      return 'ContentAsset';
    case 'reference':
      return 'ContentReference';
    case 'multi_reference':
      return 'ContentReference[]';
    case 'rich_text':
      return 'ContentRichText';
    // text, date, and link all travel as strings.
    default:
      return 'string';
  }
}

/**
 * Names the change that retired the key, so whoever meets the strikethrough
 * knows when it happened and who to ask. The date is the ISO day rather than a
 * locale format, which would make the generated file differ between machines.
 */
function deprecationNote(deprecation: { at: string; by?: string }): string {
  const who = deprecation.by === undefined ? '' : ` by ${deprecation.by}`;
  const when = deprecation.at.slice(0, 10);
  return `@deprecated Deleted from the content model on ${when}${who}; entries still return the last value it held, until it is purged.`;
}

/**
 * What the editor needs that the type cannot say: which collection a reference
 * points at, since the type is the same shape whatever the target, and whether
 * the field has been deleted from the model.
 *
 * A deleted field is emitted as a deprecation rather than dropped, and the
 * entries behind it keep answering with the last value they held. Removing it
 * would turn every read of the key into a type error, and dropping the value
 * would blank the page that read it, the moment the model was regenerated:
 * the two things a change made in the Stet UI must never do to a running site.
 */
function fieldDoc(field: ModelField): string[] {
  const lines: string[] = [];
  if (field.collection !== undefined) {
    const target = JSON.stringify(field.collection);
    const plural = field.type === 'multi_reference' ? 'References' : 'Reference';
    lines.push(`${plural} into ${target}: fetch with stet[${target}].get(slug).`);
  }
  if (field.deprecated !== undefined) {
    lines.push(deprecationNote(field.deprecated));
  }
  return lines;
}

/** Renders doc lines as a comment: one line inline, several as a block. */
function docComment(lines: string[], indent: string): string[] {
  if (lines.length === 0) {
    return [];
  }
  if (lines.length === 1) {
    return [`${indent}/** ${lines[0]} */`];
  }
  return [`${indent}/**`, ...lines.map((line) => `${indent} * ${line}`), `${indent} */`];
}

/**
 * Renders the generated `stet.gen.ts`: one entry type per collection or map
 * and a `stet` client typed by them. The API key and the origin are both read
 * from the environment at runtime, so the key is never embedded and the file
 * is safe to commit.
 */
export function renderContentModule(model: ContentModel, origin: string): string {
  const fields = model.types.flatMap((type) => type.fields);
  // Only import what the model uses, so a project with no asset or reference
  // field has no unused import to trip its lint over.
  const imported = ['ContentEntryBase'];
  if (fields.some((field) => field.type === 'asset')) {
    imported.push('ContentAsset');
  }
  if (fields.some((field) => field.type === 'reference' || field.type === 'multi_reference')) {
    imported.push('ContentReference');
  }
  if (fields.some((field) => field.type === 'rich_text')) {
    imported.push('ContentRichText');
  }

  const lines: string[] = [
    '// Generated by Stet from your content model. Do not edit: it is',
    '// regenerated by @stetcms/vite or `stet generate`.',
    "import { createContentClient } from '@stetcms/client';",
    `import type { ${imported.join(', ')} } from '@stetcms/client';`,
    '',
  ];

  for (const type of model.types) {
    lines.push(`export type ${entryTypeName(type.slug)} = ContentEntryBase & {`, '  fields: {');
    for (const field of type.fields) {
      lines.push(...docComment(fieldDoc(field), '    '));
      lines.push(`    ${JSON.stringify(field.key)}?: ${fieldTsType(field)} | null;`);
    }
    lines.push('  };', '};', '');
  }

  lines.push('export type StetContentModel = {');
  for (const type of model.types) {
    lines.push(
      `  ${JSON.stringify(type.slug)}: { kind: ${JSON.stringify(type.kind)}; entry: ${entryTypeName(type.slug)} };`,
    );
  }
  lines.push('};', '');

  // Both are read from the environment at runtime, so one generated file
  // works in every environment: the origin it was generated against is only
  // the fallback, and a build that could not refresh this file cannot pin a
  // deployment to whatever origin the last developer generated from.
  lines.push(
    'const origin =',
    `  typeof process === 'undefined' ? ${JSON.stringify(origin)} : (process.env.STET_ORIGIN ?? ${JSON.stringify(origin)});`,
    '',
    'export const stet = createContentClient<StetContentModel>({',
    '  origin,',
    "  apiKey: typeof process === 'undefined' ? undefined : process.env.STET_API_KEY,",
    '});',
    '',
  );

  return lines.join('\n');
}
