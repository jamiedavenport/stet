import type { PageRoom } from '@repo/realtime/client';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Button } from '@repo/ui/components/button';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowUpRightIcon, Trash2Icon } from 'lucide-react';

import { EntryCell } from '#/content/cells/entry-cell.tsrx';
import type { EntryRow, EntryType, Member } from '#/content/entry/functions';
import { AddField, FieldHeader } from '#/content/field/header.tsrx';
import type { FieldValue } from '#/content/field/schema';
import { MetaCell } from '#/content/cells/meta-cell.tsrx';
import type { ModelField } from '#/content/model/functions';
import { useRowWatchers } from '#/content/presence';
import type { CellLocation } from '#/content/presence';
import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';

export type TableContext = {
  type: EntryType;
  members: Member[];
  room: PageRoom | null;
  saveCell: (entryId: string, fieldKey: string, value: FieldValue) => Promise<void>;
  saveMeta: (entryId: string, patch: { title?: string; slug?: string }) => Promise<void>;
  addOption: (field: ModelField, name: string) => Promise<string>;
  setEditing: (location: CellLocation | null) => void;
  removeEntry: (entryId: string) => Promise<void>;
  /** Refetches the model and entries everywhere after a field change. */
  refresh: () => Promise<void>;
};

// Subscribes for itself so presence changes never rebuild the column defs,
// which would remount every cell and close any open editor.
function RowWatchers({ room, entryId }: { room: PageRoom | null; entryId: string }) {
  const watchers = useRowWatchers(room, entryId);
  return (
    <span className="flex items-center -space-x-1">
      {watchers.map((user) => (
        <span key={user.id} title={`${user.name} is here`}>
          <Avatar size="sm" className="size-4">
            <AvatarImage src={imageSrc(user.image, 64)} />
            <AvatarFallback className="text-[8px]">{initials(user.name)}</AvatarFallback>
          </Avatar>
        </span>
      ))}
    </span>
  );
}

// Written as plain TSX rather than TSRX: column defs are header/cell render
// functions, which the directive syntax cannot express.
export function buildEntryColumns(context: TableContext): ColumnDef<EntryRow>[] {
  const titleColumn: ColumnDef<EntryRow> = {
    id: 'title',
    header: () => <span className="px-1">{'Title'}</span>,
    cell: ({ row }) => (
      <span className="flex items-center gap-1">
        <MetaCell
          value={row.original.title}
          label="Title"
          room={context.room}
          entryId={row.original.id}
          cellKey="$title"
          onSave={(title: string) => context.saveMeta(row.original.id, { title })}
          onEditingChange={(editing: boolean) =>
            context.setEditing(editing ? { entryId: row.original.id, fieldKey: '$title' } : null)
          }
        />
        <Link
          to="/app/c/$collection/$entry"
          params={{ collection: context.type.slug, entry: row.original.id }}
          aria-label={`Open ${row.original.title}`}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
        >
          <ArrowUpRightIcon className="size-4" />
        </Link>
        <RowWatchers room={context.room} entryId={row.original.id} />
      </span>
    ),
  };

  const slugColumn: ColumnDef<EntryRow> = {
    id: 'slug',
    header: () => <span className="px-1">{'Slug'}</span>,
    cell: ({ row }) => (
      <MetaCell
        value={row.original.slug}
        label="Slug"
        mono
        room={context.room}
        entryId={row.original.id}
        cellKey="$slug"
        onSave={(slug: string) => context.saveMeta(row.original.id, { slug })}
        onEditingChange={(editing: boolean) =>
          context.setEditing(editing ? { entryId: row.original.id, fieldKey: '$slug' } : null)
        }
      />
    ),
  };

  const fieldColumns = context.type.fields.map(
    (field): ColumnDef<EntryRow> => ({
      id: field.key,
      header: () => <FieldHeader field={field} onChanged={context.refresh} />,
      cell: ({ row }) => (
        <EntryCell
          field={field}
          value={row.original.values[field.key]}
          members={context.members}
          room={context.room}
          entryId={row.original.id}
          onSave={(value: FieldValue) => context.saveCell(row.original.id, field.key, value)}
          onEditingChange={(editing: boolean) =>
            context.setEditing(editing ? { entryId: row.original.id, fieldKey: field.key } : null)
          }
          onAddOption={(name: string) => context.addOption(field, name)}
          editorLink={{ collection: context.type.slug, entryId: row.original.id }}
        />
      ),
    }),
  );

  const addColumn: ColumnDef<EntryRow> = {
    id: 'add-field',
    header: () => <AddField typeId={context.type.id} onCreated={context.refresh} />,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${row.original.title}`}
        className="opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-destructive focus-visible:opacity-100"
        onClick={() => void context.removeEntry(row.original.id)}
      >
        <Trash2Icon className="size-4" />
      </Button>
    ),
  };

  return [titleColumn, slugColumn, ...fieldColumns, addColumn];
}
