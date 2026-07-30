import { useMemo } from 'react';
import { usePageRoomContext } from '@repo/realtime/client';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, useRouter } from '@tanstack/react-router';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { CellDataProvider } from '#/content/cells/context';
import { EntriesTable } from '#/content/collection/table';
import { buildEntryColumns } from '#/content/collection/columns';
import {
  createEntry,
  deleteEntry,
  entriesQuery,
  membersQuery,
  updateEntry,
} from '#/content/entry/functions';
import { updateField } from '#/content/field/functions';
import { nextOptionColor } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import { contentModelQuery } from '#/content/model/functions';
import type { ModelField } from '#/content/model/functions';
import { bumpContentVersion, setCellLocation, useContentVersion } from '#/content/presence';
import type { CellLocation } from '#/content/presence';
import { TypeHeader } from '#/content/model/type-header.tsrx';
import { useAppRoute } from '#/use-app-route';

const route = getRouteApi('/app/c/$collection/');

/** One collection as a Notion-style table: rows are entries, columns are fields. */
export function CollectionEntries() @{
  const { activeOrganization } = useAppRoute();
  const { collection } = route.useParams();
  const { data } = useSuspenseQuery(entriesQuery(activeOrganization.id, collection));
  useBreadcrumbs([{ label: data.type.name }]);
  const members = useSuspenseQuery(membersQuery(activeOrganization.id)).data;
  const queryClient = useQueryClient();
  const router = useRouter();
  const { room } = usePageRoomContext();

  const refetch = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: entriesQuery(activeOrganization.id, collection).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: contentModelQuery(activeOrganization.id).queryKey,
      }),
    ]);
  };

  // Refetch when someone else changes the collection; bump when we do.
  useContentVersion(room, () => void refetch());
  const changed = async () => {
    await refetch();
    if (room !== null) {
      bumpContentVersion(room);
    }
  };

  // Keyed on the slice of the type the columns actually render: entry
  // refetches produce a fresh object every time, and rebuilding columns
  // remounts every cell (closing any open editor). Renames stay out of the
  // key for the same reason; no column reads the name.
  const typeKey = JSON.stringify({ id: data.type.id, slug: data.type.slug, fields: data.type.fields });
  const columns = useMemo(
    () =>
      buildEntryColumns({
        type: data.type,
        members,
        room,
        saveCell: async (entryId: string, fieldKey: string, value: FieldValue) => {
          await updateEntry({ data: { id: entryId, values: { [fieldKey]: value } } });
          await changed();
        },
        saveMeta: async (entryId: string, patch: { title?: string; slug?: string }) => {
          await updateEntry({ data: { id: entryId, ...patch } });
          await changed();
        },
        addOption: async (field: ModelField, name: string) => {
          const options = field.config.options ?? [];
          const option = { id: crypto.randomUUID(), name, color: nextOptionColor(options) };
          await updateField({ data: { id: field.id, config: { options: [...options, option] } } });
          await changed();
          return option.id;
        },
        setEditing: (location: CellLocation | null) => {
          if (room !== null) {
            setCellLocation(room, location);
          }
        },
        removeEntry: async (entryId: string) => {
          await deleteEntry({ data: { id: entryId } });
          await changed();
        },
        refresh: changed,
      }),
    [typeKey, members, room],
  );

  const addEntry = async () => {
    await createEntry({ data: { typeId: data.type.id } });
    await changed();
  };

  <CellDataProvider lookup={data.lookup} organizationId={activeOrganization.id}>
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6">
      <TypeHeader
        type={data.type}
        entryCount={data.entries.length}
        onChanged={changed}
        onSlugChanged={(slug) =>
          router.navigate({ to: '/app/c/$collection', params: { collection: slug } })
        }
        onDeleted={() => router.navigate({ to: '/app' })}
      />
      <EntriesTable columns={columns} entries={data.entries} onAddEntry={() => void addEntry()} />
      @if (data.type.fields.length === 0) {
        <p className="text-sm text-muted-foreground">
          {"Add fields with the + button in the table header. Rich text fields open the collaborative editor."}
        </p>
      }
    </div>
  </CellDataProvider>
}
