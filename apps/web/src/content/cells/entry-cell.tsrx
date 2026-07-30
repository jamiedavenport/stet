import { useState } from 'react';
import type { PageRoom } from '@repo/realtime/client';
import type { PresenceUser } from '@repo/realtime/types';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/avatar';
import { Checkbox } from '@repo/ui/components/checkbox';
import { Input } from '@repo/ui/components/input';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { Link } from '@tanstack/react-router';
import { FileTextIcon } from '@phosphor-icons/react';

import { AssetEditor } from '#/content/cells/asset-editor.tsrx';
import { CellDisplay } from '#/content/cells/display.tsrx';
import { PersonEditor, SelectEditor } from '#/content/cells/choice.tsrx';
import { ReferenceEditor } from '#/content/cells/reference-editor.tsrx';
import { useCellData } from '#/content/cells/context';
import type { Member } from '#/content/entry/functions';
import { isReferenceType } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import type { ModelField } from '#/content/model/functions';
import { useCellWatchers } from '#/content/presence';
import { imageSrc } from '#/files/urls';
import { initials } from '#/initials';

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
};

const inputTypes = { text: 'text', number: 'number', date: 'date', link: 'url' } as const;

export function EntryCell(props: EntryCellProps) @{
  const { field, value, members } = props;
  const { lookup, organizationId } = useCellData();
  const watchers = useCellWatchers(props.room, props.entryId, field.key);
  const [open, setOpen] = useState(false);

  const setOpenAndSignal = (next: boolean) => {
    setOpen(next);
    props.onEditingChange(next);
  };

  const editable =
    field.type === 'text' ||
    field.type === 'number' ||
    field.type === 'date' ||
    field.type === 'link';

  <>
    @if (field.type === 'checkbox') {
      <span className="flex items-center gap-1 px-1">
        <Checkbox
          checked={value === true}
          aria-label={field.name}
          onCheckedChange={(checked) => void props.onSave(checked === true)}
        />
        <Watchers watchers={watchers} />
      </span>
    }
    @if (field.type === 'rich_text') {
      <span className="flex items-center gap-1 px-1">
        @if (props.editorLink !== null && 'collection' in props.editorLink) {
          <Link
            to="/app/c/$collection/$entry/$field"
            params={{
              collection: props.editorLink.collection,
              entry: props.editorLink.entryId,
              field: field.key,
            }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <FileTextIcon className="size-3.5" />
            {"Open"}
          </Link>
        }
        @if (props.editorLink !== null && 'map' in props.editorLink) {
          <Link
            to="/app/m/$map/$field"
            params={{ map: props.editorLink.map, field: props.editorLink.fieldKey }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <FileTextIcon className="size-3.5" />
            {"Open"}
          </Link>
        }
        <Watchers watchers={watchers} />
      </span>
    }
    @if (field.type !== 'checkbox' && field.type !== 'rich_text') {
      <Popover open={open} onOpenChange={setOpenAndSignal}>
        {/* "value" suffixed so the trigger never shares a name with the
          field's own header/key button when both sit in one row. */}
        <PopoverTrigger
          aria-label={`${field.name} value`}
          className="flex min-h-7 w-full items-center gap-1 rounded-md px-1 text-left hover:bg-muted/60"
        >
          <span className="flex-1 overflow-hidden">
            <CellDisplay field={field} value={value} members={members} />
          </span>
          <Watchers watchers={watchers} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2">
          @if (field.type === 'select' || field.type === 'multi_select') {
            <SelectEditor
              options={field.config.options ?? []}
              value={Array.isArray(value) || typeof value === 'string' ? value : undefined}
              multiple={field.type === 'multi_select'}
              onPick={(optionId) => {
                if (field.type === 'multi_select') {
                  const current = Array.isArray(value) ? value : [];
                  const next = current.includes(optionId)
                    ? current.filter((id) => id !== optionId)
                    : [...current, optionId];
                  void props.onSave(next);
                } else {
                  void props.onSave(value === optionId ? null : optionId);
                  setOpenAndSignal(false);
                }
              }}
              onClear={() => {
                void props.onSave(null);
                setOpenAndSignal(false);
              }}
              onAddOption={async (name) => {
                const optionId = await props.onAddOption(name);
                if (field.type === 'multi_select') {
                  const current = Array.isArray(value) ? value : [];
                  await props.onSave([...current, optionId]);
                } else {
                  await props.onSave(optionId);
                  setOpenAndSignal(false);
                }
              }}
            />
          }
          @if (field.type === 'person') {
            <PersonEditor
              members={members}
              value={typeof value === 'string' ? value : undefined}
              onPick={(userId) => {
                void props.onSave(userId);
                setOpenAndSignal(false);
              }}
              onClear={() => {
                void props.onSave(null);
                setOpenAndSignal(false);
              }}
            />
          }
          @if (isReferenceType(field.type) && field.config.typeId !== undefined) {
            <ReferenceEditor
              organizationId={organizationId}
              targetTypeId={field.config.typeId}
              value={typeof value === 'string' ? [value] : Array.isArray(value) ? value : []}
              multiple={field.type === 'multi_reference'}
              titles={lookup.entries}
              onPick={(entryId) => {
                if (field.type === 'multi_reference') {
                  const current = Array.isArray(value) ? value : [];
                  void props.onSave(
                    current.includes(entryId)
                      ? current.filter((id) => id !== entryId)
                      : [...current, entryId],
                  );
                } else {
                  void props.onSave(value === entryId ? null : entryId);
                  setOpenAndSignal(false);
                }
              }}
              onClear={() => {
                void props.onSave(null);
                setOpenAndSignal(false);
              }}
            />
          }
          @if (field.type === 'asset') {
            <AssetEditor
              asset={
                typeof value === 'string' && lookup.assets[value] !== undefined
                  ? { id: value, ...lookup.assets[value] }
                  : null
              }
              onPick={async (assetId) => {
                await props.onSave(assetId);
                setOpenAndSignal(false);
              }}
              onClear={() => {
                void props.onSave(null);
                setOpenAndSignal(false);
              }}
            />
          }
          @if (editable) {
            <ValueInput
              type={field.type === 'text' ? 'text' : inputTypes[field.type as keyof typeof inputTypes]}
              isNumber={field.type === 'number'}
              initial={value}
              onCommit={(next) => void props.onSave(next)}
              onDone={() => setOpenAndSignal(false)}
            />
          }
        </PopoverContent>
      </Popover>
    }
  </>
}

/**
 * Free-text style editor: commits on blur as well as Enter, so clicking away
 * (or Escape closing the popover) keeps what was typed.
 */
function ValueInput({
  type,
  isNumber,
  initial,
  onCommit,
  onDone,
}: {
  type: string;
  isNumber: boolean;
  initial: FieldValue | undefined;
  onCommit: (value: FieldValue) => void;
  onDone: () => void;
}) @{
  const [draft, setDraft] = useState(
    initial === undefined || initial === null ? '' : String(initial),
  );

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onCommit(null);
      return;
    }
    if (isNumber) {
      const parsed = Number(trimmed);
      onCommit(Number.isFinite(parsed) ? parsed : null);
      return;
    }
    onCommit(trimmed);
  };

  <Input
    autoFocus
    type={type}
    value={draft}
    aria-label={"Cell value"}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={commit}
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
        onDone();
      }
    }}
  />
}

function Watchers({ watchers }: { watchers: PresenceUser[] }) @{
  @if (watchers.length > 0) {
    <span className="flex shrink-0 items-center -space-x-1">
      @for (const watcher of watchers; key watcher.id) {
        <span title={`${watcher.name} is editing`}>
          <Avatar size="sm" className="size-4 ring-2 ring-primary">
            <AvatarImage src={imageSrc(watcher.image, 64)} />
            <AvatarFallback className="text-[8px]">{initials(watcher.name)}</AvatarFallback>
          </Avatar>
        </span>
      }
    </span>
  }
}
