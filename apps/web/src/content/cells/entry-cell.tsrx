import type { PageRoom } from '@repo/realtime/client';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Link } from '@tanstack/react-router';
import { FileTextIcon } from '@phosphor-icons/react';

import { ChoiceCell } from '#/content/cells/choice-cell.tsrx';
import { DateCell } from '#/content/cells/date-cell.tsrx';
import { CellDisplay } from '#/content/cells/display.tsrx';
import { InlineCell } from '#/content/cells/inline-cell.tsrx';
import { toLink } from '#/content/cells/links';
import { Watchers } from '#/content/cells/watchers.tsrx';
import type { Member } from '#/content/entry/functions';
import type { FieldValue } from '@repo/content/schema';
import type { ModelField } from '#/content/model/functions';
import { useCellWatchers } from '#/content/presence';

export type EntryCellProps = {
  field: ModelField;
  value: FieldValue | undefined;
  members: Member[];
  /** The room presence rides on; the cell subscribes for its own watchers. */
  room: PageRoom | null;
  entryId: string;
  onSave: (value: FieldValue) => Promise<void>;
  onEditingChange: (editing: boolean) => void;
  /** Creates the named option on the field and resolves to its id. */
  onAddOption: (name: string) => Promise<string>;
  /** Where the rich text cell opens its dedicated editor page. */
  editorLink: { collection: string; entryId: string } | { map: string; fieldKey: string } | null;
  /** Set in the table, where a wrapping value would make the row taller than its neighbours. */
  singleLine?: boolean;
};

const inputTypes = { text: 'text', number: 'number', link: 'url' } as const;

export function EntryCell(props: EntryCellProps) @{
  const { field, value, members } = props;
  const watchers = useCellWatchers(props.room, props.entryId, field.key);
  const typed =
    field.type === 'text' || field.type === 'number' || field.type === 'link'
      ? field.type
      : undefined;
  // Only ever a web address: what the cell stores is checked, but a value
  // that arrived another way is not, and Ctrl+Click follows it.
  const link = field.type === 'link' && typeof value === 'string' ? toLink(value) : null;

  // Free text, numbers and links are typed straight into the cell. Anything
  // the field will not take keeps the editor open rather than being stored.
  const commit = (raw: string): boolean => {
    const typedValue = raw.trim();
    if (typedValue === '') {
      void props.onSave(null);
      return true;
    }
    if (field.type === 'number') {
      const parsed = Number(typedValue);
      if (!Number.isFinite(parsed)) {
        return false;
      }
      void props.onSave(parsed);
      return true;
    }
    if (field.type === 'link') {
      const url = toLink(typedValue);
      if (url === null) {
        return false;
      }
      void props.onSave(url);
      return true;
    }
    void props.onSave(typedValue);
    return true;
  };

  <span className="flex w-full items-center gap-1">
    @if (field.type === 'checkbox') {
      <span className="px-1">
        <Checkbox
          checked={value === true}
          aria-label={field.name}
          onCheckedChange={(checked) => void props.onSave(checked === true)}
        />
      </span>
    }
    @if (field.type === 'rich_text' && props.editorLink !== null && 'collection' in props.editorLink) {
      <Link
        to="/app/c/$collection/$entry/$field"
        params={{
          collection: props.editorLink.collection,
          entry: props.editorLink.entryId,
          field: field.key,
        }}
        className="flex items-center gap-1.5 px-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <FileTextIcon className="size-3.5" />
        {"Open"}
      </Link>
    }
    @if (field.type === 'rich_text' && props.editorLink !== null && 'map' in props.editorLink) {
      <Link
        to="/app/m/$map/$field"
        params={{ map: props.editorLink.map, field: props.editorLink.fieldKey }}
        className="flex items-center gap-1.5 px-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <FileTextIcon className="size-3.5" />
        {"Open"}
      </Link>
    }
    @if (typed !== undefined) {
      <InlineCell
        label={`${field.name} value`}
        inputLabel="Cell value"
        text={value === undefined || value === null ? '' : String(value)}
        type={inputTypes[typed]}
        onCommit={commit}
        onEditingChange={props.onEditingChange}
        onModifierClick={link === null ? undefined : () => window.open(link, '_blank', 'noopener')}
      >
        <CellDisplay field={field} value={value} members={members} singleLine={props.singleLine} />
      </InlineCell>
    }
    @if (field.type === 'date') {
      <DateCell
        label={`${field.name} value`}
        value={value}
        onSave={(next: string | null) => void props.onSave(next)}
        onEditingChange={props.onEditingChange}
      >
        <CellDisplay field={field} value={value} members={members} singleLine={props.singleLine} />
      </DateCell>
    }
    @if (field.type === 'select' || field.type === 'multi_select' || field.type === 'person' || field.type === 'asset' || field.type === 'reference' || field.type === 'multi_reference') {
      <ChoiceCell
        field={field}
        value={value}
        members={members}
        onSave={props.onSave}
        onEditingChange={props.onEditingChange}
        onAddOption={props.onAddOption}
      >
        <CellDisplay field={field} value={value} members={members} singleLine={props.singleLine} />
      </ChoiceCell>
    }
    <Watchers watchers={watchers} />
  </span>
}
