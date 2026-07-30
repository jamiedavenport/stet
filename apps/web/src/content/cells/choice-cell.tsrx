import { useState } from 'react';
import type { ReactNode } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';

import { AssetEditor } from '#/content/cells/asset-editor.tsrx';
import { PersonEditor, SelectEditor } from '#/content/cells/choice.tsrx';
import { ReferenceEditor } from '#/content/cells/reference-editor.tsrx';
import { useCellData } from '#/content/cells/context';
import type { Member } from '#/content/entry/functions';
import { isReferenceType } from '@repo/content/schema';
import type { FieldValue } from '@repo/content/schema';
import type { ModelField } from '#/content/model/functions';

type ChoiceCellProps = {
  field: ModelField;
  value: FieldValue | undefined;
  members: Member[];
  onSave: (value: FieldValue) => Promise<void>;
  onEditingChange: (editing: boolean) => void;
  /** Creates the named option on the field and resolves to its id. */
  onAddOption: (name: string) => Promise<string>;
  /** The read view, shown in the cell until it is clicked. */
  children: ReactNode;
};

/**
 * A cell whose value is picked from a list: options, people, entries of
 * another collection, or a file. Each opens its own picker below the cell.
 */
export function ChoiceCell(props: ChoiceCellProps) @{
  const { field, value, members } = props;
  const { lookup, organizationId } = useCellData();
  const [open, setOpen] = useState(false);

  const setOpenAndSignal = (next: boolean) => {
    setOpen(next);
    props.onEditingChange(next);
  };

  const pickOne = (picked: FieldValue) => {
    void props.onSave(value === picked ? null : picked);
    setOpenAndSignal(false);
  };

  const toggle = (id: string) => {
    const current = Array.isArray(value) ? value : [];
    void props.onSave(current.includes(id) ? current.filter((held) => held !== id) : [...current, id]);
  };

  const clear = () => {
    void props.onSave(null);
    setOpenAndSignal(false);
  };

  <Popover open={open} onOpenChange={setOpenAndSignal}>
    {/* "value" suffixed so the trigger never shares a name with the field's
      own header/key button when both sit in one row. */}
    <PopoverTrigger
      aria-label={`${field.name} value`}
      className="flex min-h-7 min-w-0 flex-1 items-center rounded-md px-1 text-left hover:bg-muted/60"
    >
      <span className="min-w-0 flex-1 overflow-hidden">{props.children}</span>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-64 p-2">
      @if (field.type === 'select' || field.type === 'multi_select') {
        <SelectEditor
          options={field.config.options ?? []}
          value={Array.isArray(value) || typeof value === 'string' ? value : undefined}
          multiple={field.type === 'multi_select'}
          onPick={(optionId: string) => {
            if (field.type === 'multi_select') {
              toggle(optionId);
            } else {
              pickOne(optionId);
            }
          }}
          onClear={clear}
          onAddOption={async (name: string) => {
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
          onPick={(userId: string) => pickOne(userId)}
          onClear={clear}
        />
      }
      @if (isReferenceType(field.type) && field.config.typeId !== undefined) {
        <ReferenceEditor
          organizationId={organizationId}
          targetTypeId={field.config.typeId}
          value={typeof value === 'string' ? [value] : Array.isArray(value) ? value : []}
          multiple={field.type === 'multi_reference'}
          titles={lookup.entries}
          onPick={(entryId: string) => {
            if (field.type === 'multi_reference') {
              toggle(entryId);
            } else {
              pickOne(entryId);
            }
          }}
          onClear={clear}
        />
      }
      @if (field.type === 'asset') {
        <AssetEditor
          asset={
            typeof value === 'string' && lookup.assets[value] !== undefined
              ? { id: value, ...lookup.assets[value] }
              : null
          }
          onPick={async (assetId: string) => {
            await props.onSave(assetId);
            setOpenAndSignal(false);
          }}
          onClear={clear}
        />
      }
    </PopoverContent>
  </Popover>
}
