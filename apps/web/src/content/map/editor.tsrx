import { usePageRoomContext } from '@repo/realtime/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/table';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { getRouteApi, useRouter } from '@tanstack/react-router';

import { useBreadcrumbs } from '#/components/breadcrumbs';
import { CellDataProvider } from '#/content/cells/context';
import { EntryCell } from '#/content/cells/entry-cell.tsrx';
import { mapEntryQuery, membersQuery, updateEntry } from '#/content/entry/functions';
import { AddField, FieldHeader } from '#/content/field/header.tsrx';
import { updateField } from '#/content/field/functions';
import { nextOptionColor } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import { contentModelQuery } from '#/content/model/functions';
import type { ModelField } from '#/content/model/functions';
import { setCellLocation, useContentVersion } from '#/content/presence';
import { TypeHeader } from '#/content/model/type-header.tsrx';
import { useAppRoute } from '#/use-app-route';

const route = getRouteApi('/app/m/$map/');

/**
 * A map is one entry, shown as a key/value table: each row is a field of the
 * map, edited inline like a collection cell. Rich text rows open their own
 * editor page.
 */
export function MapEditor() @{
  const { activeOrganization } = useAppRoute();
  const params = route.useParams();
  const { data } = useSuspenseQuery(mapEntryQuery(activeOrganization.id, params.map));
  useBreadcrumbs([{ label: data.type.name }]);
  const members = useSuspenseQuery(membersQuery(activeOrganization.id)).data;
  const queryClient = useQueryClient();
  const router = useRouter();
  const { room } = usePageRoomContext();

  // Read the map again: after our own write, and when the room says someone
  // else's landed.
  const changed = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: mapEntryQuery(activeOrganization.id, params.map).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: contentModelQuery(activeOrganization.id).queryKey,
      }),
    ]);
  };

  useContentVersion(room, () => void changed());

  const saveValue = async (field: ModelField, value: FieldValue) => {
    await updateEntry({ data: { id: data.entry.id, values: { [field.key]: value } } });
    await changed();
  };

  const addOption = async (field: ModelField, name: string) => {
    const options = field.config.options ?? [];
    const option = { id: crypto.randomUUID(), name, color: nextOptionColor(options) };
    await updateField({ data: { id: field.id, config: { options: [...options, option] } } });
    await changed();
    return option.id;
  };

  <CellDataProvider lookup={data.lookup} organizationId={activeOrganization.id}>
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <TypeHeader
        type={data.type}
        onChanged={changed}
        onSlugChanged={(slug) => router.navigate({ to: '/app/m/$map', params: { map: slug } })}
        onDeleted={() => router.navigate({ to: '/app' })}
      />
      <div className="-mx-6 [&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
        <Table className="border-b">
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">{"Key"}</TableHead>
              <TableHead>{"Value"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            @for (const field of data.type.fields; key field.id) {
              <TableRow className="group/row h-12">
                <TableCell className="px-2 py-0">
                  <FieldHeader field={field} orientation="row" onChanged={changed} />
                </TableCell>
                <TableCell className="px-2 py-0">
                  <EntryCell
                    field={field}
                    value={data.entry.values[field.key]}
                    members={members}
                    room={room}
                    entryId={data.entry.id}
                    onSave={(value) => saveValue(field, value)}
                    onEditingChange={(editing) => {
                      if (room !== null) {
                        setCellLocation(
                          room,
                          editing ? { entryId: data.entry.id, fieldKey: field.key } : null,
                        );
                      }
                    }}
                    onAddOption={(name) => addOption(field, name)}
                    editorLink={{ map: data.type.slug, fieldKey: field.key }}
                  />
                </TableCell>
              </TableRow>
            }
          </TableBody>
        </Table>
        <AddField typeId={data.type.id} label="New key" onCreated={changed} />
      </div>
      @if (data.type.fields.length === 0) {
        <p className="mt-6 text-sm text-muted-foreground">
          {"Add keys to hold this map's values. A rich text key opens the collaborative editor."}
        </p>
      }
    </div>
  </CellDataProvider>
}
