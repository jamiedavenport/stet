import path from 'node:path';

import { D1Helper } from '@nerdfolio/drizzle-d1-helpers';

import { migrateDocument, migrateRecord } from './field-actions-migration.ts';
import type { FieldMapping } from './field-actions-migration.ts';

try {
  process.loadEnvFile();
} catch {
  // Rely on ambient credentials when no package .env is present.
}

if (!process.env.DRIZZLE_REMOTE) {
  throw new Error('Set DRIZZLE_REMOTE=1. This one-shot command only targets production D1.');
}

type FieldRow = FieldMapping & {
  type_id: string;
  name: string;
  created_at: number;
  deleted_at: number | null;
  deleted_by: string | null;
};
type EntryRow = { id: string; type_id: string; values: string };
type RevisionRow = { id: string; type_id: string; values: string; bodies: string };
type DocumentRow = { organization_id: string; page: string; type_id: string; state: number[] };
type QueryResult<T> = { results: T[]; meta: { changes: number } };

const webDir = path.resolve(import.meta.dirname, '../../../apps/web');
const cwd = process.cwd();
process.chdir(webDir);
const credentials = D1Helper.get().withCfCredentials(
  process.env.CLOUDFLARE_ACCOUNT_ID,
  process.env.CLOUDFLARE_D1_TOKEN,
).proxyCredentials;
process.chdir(cwd);
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/d1/database/${credentials.databaseId}/query`;

async function query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${credentials.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const body = (await response.json()) as {
    success: boolean;
    errors?: { message: string }[];
    result?: QueryResult<T>[];
  };
  if (!body.success || body.result === undefined) {
    throw new Error(body.errors?.map((error) => error.message).join(', ') ?? response.statusText);
  }
  return body.result[0];
}

const fields = (
  await query<FieldRow>(
    'SELECT id, type_id, key, name, type, created_at, deleted_at, deleted_by FROM content_field ORDER BY type_id, position',
  )
).results;
const entries = (
  await query<EntryRow>('SELECT id, type_id, "values" FROM content_entry ORDER BY id')
).results;
const revisions = (
  await query<RevisionRow>(
    'SELECT r.id, e.type_id, r."values", r.bodies FROM content_revision r JOIN content_entry e ON e.id = r.entry_id ORDER BY r.id',
  )
).results;
const documents = (
  await query<DocumentRow>(
    "SELECT d.organization_id, d.page, e.type_id, d.state FROM document d JOIN content_entry e ON d.page = '/entry/' || e.id ORDER BY d.organization_id, d.page",
  )
).results;

const byType = new Map<string, FieldRow[]>();
for (const field of fields) {
  const mapping = byType.get(field.type_id) ?? [];
  mapping.push(field);
  byType.set(field.type_id, mapping);
}
const entryChanges = entries.flatMap((entry) => {
  const result = migrateRecord(entry.values, byType.get(entry.type_id) ?? [], `entry ${entry.id}`);
  return result.changed ? [{ ...entry, values: result.value }] : [];
});
const revisionChanges = revisions.flatMap((revision) => {
  const mapping = byType.get(revision.type_id) ?? [];
  const values = migrateRecord(revision.values, mapping, `revision ${revision.id} values`);
  const bodies = migrateRecord(revision.bodies, mapping, `revision ${revision.id} bodies`);
  return values.changed || bodies.changed
    ? [{ ...revision, values: values.value, bodies: bodies.value }]
    : [];
});
const documentChanges = documents.flatMap((document) => {
  const result = migrateDocument(
    new Uint8Array(document.state),
    byType.get(document.type_id) ?? [],
    `document ${document.organization_id}:${document.page}`,
  );
  return result.changed ? [{ ...document, state: Array.from(result.state) }] : [];
});

if (documentChanges.length > 0) {
  const sample = documentChanges[0].state;
  const binding = (
    await query<{ kind: string; length: number }>('SELECT typeof(?) kind, length(?) length', [
      sample,
      sample,
    ])
  ).results[0];
  if (binding.kind !== 'blob' || binding.length !== sample.length) {
    throw new Error('D1 did not bind the migrated Yjs state as a BLOB.');
  }
}

console.log(
  `[field-actions] ${fields.length} fields; ${entryChanges.length}/${entries.length} entries, ${revisionChanges.length}/${revisions.length} revisions, and ${documentChanges.length}/${documents.length} entry documents need conversion.`,
);

const dryRun = process.argv.includes('--dry-run');
const apply = process.argv.includes('--apply');
if (dryRun === apply) {
  throw new Error('Pass exactly one of --dry-run or --apply.');
}
if (dryRun) {
  console.log('[field-actions] Dry run complete. Production was not changed.');
  process.exit(0);
}

await query(`CREATE TABLE IF NOT EXISTS content_field_key (
  id text PRIMARY KEY NOT NULL,
  field_id text NOT NULL REFERENCES content_field(id) ON DELETE cascade,
  type_id text NOT NULL REFERENCES content_type(id) ON DELETE cascade,
  key text NOT NULL,
  status text NOT NULL,
  kind text,
  old_name text,
  note text,
  created_at integer NOT NULL,
  deprecated_at integer,
  deprecated_by text REFERENCES user(id) ON DELETE set null
)`);
await query(
  'CREATE UNIQUE INDEX IF NOT EXISTS content_field_key_unique_idx ON content_field_key (type_id, key)',
);
await query(
  "CREATE UNIQUE INDEX IF NOT EXISTS content_field_canonical_idx ON content_field_key (field_id) WHERE status = 'canonical'",
);
await query(
  'CREATE INDEX IF NOT EXISTS content_field_key_field_idx ON content_field_key (field_id)',
);
await query('CREATE INDEX IF NOT EXISTS content_field_key_type_idx ON content_field_key (type_id)');

for (const field of fields) {
  const deleted = field.deleted_at !== null;
  await query(
    'INSERT OR IGNORE INTO content_field_key (id, field_id, type_id, key, status, kind, old_name, note, created_at, deprecated_at, deprecated_by) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)',
    [
      field.id,
      field.id,
      field.type_id,
      field.key,
      deleted ? 'deprecated' : 'canonical',
      deleted ? 'deleted' : null,
      deleted ? field.name : null,
      field.created_at,
      field.deleted_at,
      field.deleted_by,
    ],
  );
}
for (const entry of entryChanges) {
  await query('UPDATE content_entry SET "values" = ? WHERE id = ?', [entry.values, entry.id]);
}
for (const revision of revisionChanges) {
  await query('UPDATE content_revision SET "values" = ?, bodies = ? WHERE id = ?', [
    revision.values,
    revision.bodies,
    revision.id,
  ]);
}
for (const document of documentChanges) {
  await query('UPDATE document SET state = ? WHERE organization_id = ? AND page = ?', [
    document.state,
    document.organization_id,
    document.page,
  ]);
}

console.log('[field-actions] Production data conversion applied. Run push:remote next.');
