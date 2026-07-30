import { usePageRoom } from '@repo/realtime/client';
import { Input } from '@repo/ui/components/input';
import { useSuspenseQuery } from '@tanstack/react-query';

import { CellDataProvider } from '#/content/cells/context';
import { EntryCell } from '#/content/cells/entry-cell.tsrx';
import { membersQuery, updateEntry } from '#/content/entry/functions';
import type { EntryData } from '#/content/entry/functions';
import { updateField } from '#/content/field/functions';
import { nextOptionColor } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import type { ModelField } from '#/content/model/functions';
import { bumpContentVersion, setCellLocation, useContentVersion } from '#/content/presence';
import { useAppRoute } from '#/use-app-route';

type EntryWorkspaceProps = {
  type: EntryData['type'];
  entry: EntryData['entry'];
  lookup: EntryData['lookup'];
  /**
   * The room shared with everyone viewing this content elsewhere (the
   * collection table, or the map page), carrying presence and change signals.
   */
  presencePage: string;
  onChanged: () => Promise<void>;
};

/** The entry page body: title, slug, structured fields, and rich text bodies. */
export function EntryWorkspace(props: EntryWorkspaceProps) @{
  const { type, entry } = props;
  const { user, activeOrganization } = useAppRoute();
  const presenceUser = { id: user.id, image: user.image ?? null, name: user.name };
  const members = useSuspenseQuery(membersQuery(activeOrganization.id)).data;

  const { room: presenceRoom } = usePageRoom({ page: props.presencePage, user: presenceUser });

  useContentVersion(presenceRoom, () => void props.onChanged());
  const changed = async () => {
    await props.onChanged();
    if (presenceRoom !== null) {
      bumpContentVersion(presenceRoom);
    }
  };

  const saveMeta = async (patch: { title?: string; slug?: string }) => {
    await updateEntry({ data: { id: entry.id, ...patch } });
    await changed();
  };

  const saveValue = async (field: ModelField, value: FieldValue) => {
    await updateEntry({ data: { id: entry.id, values: { [field.key]: value } } });
    await changed();
  };

  const addOption = async (field: ModelField, name: string) => {
    const options = field.config.options ?? [];
    const option = { id: crypto.randomUUID(), name, color: nextOptionColor(options) };
    await updateField({ data: { id: field.id, config: { options: [...options, option] } } });
    await changed();
    return option.id;
  };

  <CellDataProvider lookup={props.lookup} organizationId={activeOrganization.id}>
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5">
      <Input
        key={`title-${entry.title}`}
        defaultValue={entry.title}
        aria-label={"Entry title"}
        className="h-auto border-none px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:ring-0 dark:bg-transparent"
        onBlur={(event) => {
          const title = event.target.value.trim();
          if (title !== '' && title !== entry.title) {
            void saveMeta({ title });
          }
        }}
      />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{"Slug"}</span>
        <Input
          key={`slug-${entry.slug}`}
          defaultValue={entry.slug}
          aria-label={"Entry slug"}
          className="h-7 w-64 font-mono text-xs"
          onBlur={(event) => {
            const slug = event.target.value.trim();
            if (slug !== '' && slug !== entry.slug) {
              void saveMeta({ slug });
            }
          }}
        />
      </div>
      @if (type.fields.length > 0) {
        <div className="flex flex-col gap-1.5 rounded-xl border p-4">
          @for (const field of type.fields; key field.id) {
            <div className="grid grid-cols-[10rem_1fr] items-center gap-2">
              <span className="text-sm text-muted-foreground">{field.name}</span>
              <EntryCell
                field={field}
                value={entry.values[field.key]}
                members={members}
                room={presenceRoom}
                entryId={entry.id}
                onSave={(value) => saveValue(field, value)}
                onEditingChange={(editing) => {
                  if (presenceRoom !== null) {
                    setCellLocation(
                      presenceRoom,
                      editing ? { entryId: entry.id, fieldKey: field.key } : null,
                    );
                  }
                }}
                onAddOption={(name) => addOption(field, name)}
                editorLink={{ collection: type.slug, entryId: entry.id }}
              />
            </div>
          }
        </div>
      }
      @if (type.fields.every((field) => field.type !== 'rich_text')) {
        <p className="text-sm text-muted-foreground">
          {"Add a rich text field to give this entry a collaborative body."}
        </p>
      }
    </div>
  </CellDataProvider>
}
